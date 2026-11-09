import mongoose from "mongoose";
import Activity, { POINTS } from "../models/Activity.js";
import Student from "../models/Student.js";
import AppError from "../utils/AppError.js";
import { viewerScope, pickBatch } from "../utils/viewer.js";

const myStudent = async (user) => {
  const s = await Student.findOne({ user: user._id });
  if (!s) throw new AppError("Student profile not found", 404);
  return s;
};

const withStudent = (query) =>
  query.populate({ path: "student", select: "rollNumber user", populate: { path: "user", select: "name" } });

const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// GET /api/activities/mine   (student)  Own activities plus score totals
export const myActivities = async (req, res) => {
  const s = await myStudent(req.user);
  const activities = await Activity.find({ student: s._id }).sort({ createdAt: -1 });
  const score = activities.reduce((sum, a) => sum + a.approvedPoints, 0);
  const waiting = activities
    .filter((a) => a.status === "pending")
    .reduce((sum, a) => sum + (a.points - a.approvedPoints), 0);
  res.json({ score, waiting, points: POINTS, activities });
};

// POST /api/activities   (student)  Body: { title, category, stage, proofUrl, date? }
export const addActivity = async (req, res) => {
  const s = await myStudent(req.user);
  const data = pick(req.body, ["title", "category", "stage", "proofUrl", "date"]);
  const activity = await Activity.create({ ...data, student: s._id, batch: s.batch });
  res.status(201).json(activity);
};

// PATCH /api/activities/:id   (student, own only)
// Pending or rejected: fix any detail. Approved + registered: move to "selected" with a new proof.
// Any change goes back for review. Points approved earlier keep counting meanwhile.
export const updateActivity = async (req, res) => {
  const s = await myStudent(req.user);
  const activity = await Activity.findOne({ _id: req.params.id, student: s._id });
  if (!activity) throw new AppError("Activity not found", 404);

  if (activity.status === "approved") {
    if (activity.stage !== "registered" || req.body.stage !== "selected") {
      throw new AppError("Approved activities can only be moved from registered to selected");
    }
    if (!req.body.proofUrl || req.body.proofUrl === activity.proofUrl) {
      throw new AppError("Add a new proof link for the selection");
    }
    activity.stage = "selected";
    activity.proofUrl = req.body.proofUrl;
  } else {
    Object.assign(activity, pick(req.body, ["title", "category", "stage", "proofUrl", "date"]));
  }

  activity.status = "pending";
  activity.reviewNote = undefined;
  await activity.save();
  res.json(activity);
};

// DELETE /api/activities/:id   (student, own, only while pending)
export const deleteActivity = async (req, res) => {
  const s = await myStudent(req.user);
  const activity = await Activity.findOne({ _id: req.params.id, student: s._id });
  if (!activity) throw new AppError("Activity not found", 404);
  if (activity.status !== "pending" || activity.approvedPoints > 0) {
    throw new AppError("Only activities still waiting for their first review can be deleted");
  }
  await activity.deleteOne();
  res.json({ message: "Activity deleted" });
};

// GET /api/activities?status=pending&batch=<id>   (admin, hod)  Activities to review
export const listActivities = async (req, res) => {
  const scope = await viewerScope(req.user);
  const filter = {};
  if (scope.batch) filter.batch = scope.batch;
  if (req.query.batch) filter.batch = pickBatch(scope.batch, req.query.batch);
  if (req.query.status) filter.status = req.query.status;
  const activities = await withStudent(Activity.find(filter).sort({ createdAt: 1 }).limit(200));
  res.json(activities);
};

// PATCH /api/activities/:id/review   (admin, hod)  Body: { decision: "approved" | "rejected", note? }
export const reviewActivity = async (req, res) => {
  const { decision, note } = req.body;
  if (!["approved", "rejected"].includes(decision)) throw new AppError("Decision must be approved or rejected");

  const scope = await viewerScope(req.user);
  const activity = await Activity.findOne({ _id: req.params.id, ...(scope.batch ? { batch: scope.batch } : {}) });
  if (!activity) throw new AppError("Activity not found", 404);
  if (activity.status !== "pending") throw new AppError("This activity was already reviewed");
  if (decision === "rejected" && !note?.trim()) throw new AppError("Add a short reason when rejecting");

  activity.status = decision;
  if (decision === "approved") activity.approvedPoints = activity.points;
  activity.reviewNote = note?.trim() || undefined;
  activity.reviewedBy = req.user._id;
  activity.reviewedAt = new Date();
  await activity.save();
  res.json(await withStudent(Activity.findById(activity._id)));
};

// GET /api/activities/leaderboard?batch=<id>
// Students get their own batch. Top 10 plus the viewer's own rank.
// Same points = same rank.
export const leaderboard = async (req, res) => {
  let batch;
  let me = null;
  if (req.user.role === "student") {
    me = await myStudent(req.user);
    batch = me.batch;
  } else {
    if (!mongoose.isValidObjectId(req.query.batch)) throw new AppError("Pick a batch");
    const scope = await viewerScope(req.user);
    batch = pickBatch(scope.batch, req.query.batch);
    if (typeof batch !== "string" && !(batch instanceof mongoose.Types.ObjectId)) return res.json({ top: [], me: null });
  }

  const totals = await Activity.aggregate([
    { $match: { batch: new mongoose.Types.ObjectId(String(batch)), approvedPoints: { $gt: 0 } } },
    { $group: { _id: "$student", points: { $sum: "$approvedPoints" } } },
    { $sort: { points: -1, _id: 1 } },
  ]);

  const rankOf = (points) => totals.filter((t) => t.points > points).length + 1;
  const topIds = totals.slice(0, 10).map((t) => t._id);
  const students = await Student.find({ _id: { $in: topIds } }).populate("user", "name");
  const byId = new Map(students.map((s) => [String(s._id), s]));

  const top = totals.slice(0, 10).map((t) => ({
    student: t._id,
    name: byId.get(String(t._id))?.user?.name,
    rollNumber: byId.get(String(t._id))?.rollNumber,
    points: t.points,
    rank: rankOf(t.points),
  }));

  let mine = null;
  if (me) {
    const points = totals.find((t) => String(t._id) === String(me._id))?.points || 0;
    mine = { student: me._id, points, rank: rankOf(points), outOf: await Student.countDocuments({ batch }) };
  }
  res.json({ top, me: mine });
};
