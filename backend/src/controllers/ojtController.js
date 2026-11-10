import mongoose from "mongoose";
import OjtUpdate from "../models/OjtUpdate.js";
import OjtEvent from "../models/OjtEvent.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import AppError from "../utils/AppError.js";
import { viewerScope, pickBatch, departmentBatches } from "../utils/viewer.js";

// This month as "2026-11", in India time
export const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);

const myStudent = async (user) => {
  const s = await Student.findOne({ user: user._id });
  if (!s) throw new AppError("Student profile not found", 404);
  return s;
};

// Students see their batch, teachers and HODs their department, admin everything
const scopeFor = (user) => (user.role === "teacher" ? departmentBatches(user) : viewerScope(user));

const updateFields = (body) => {
  const keys = ["project", "workDone", "nextPlan", "blockers", "links"];
  const data = Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  if (Array.isArray(data.links)) data.links = data.links.map((l) => String(l).trim()).filter(Boolean);
  return data;
};

// ---------- Monthly updates ----------

// GET /api/ojt/updates/mine   (student)  All my updates, newest month first
export const myUpdates = async (req, res) => {
  const s = await myStudent(req.user);
  const updates = await OjtUpdate.find({ student: s._id }).sort({ month: -1 });
  res.json({ thisMonth: thisMonth(), updates });
};

// PUT /api/ojt/updates/mine   (student)  Save this month's update (creates or edits it)
// Body: { project, workDone, nextPlan?, blockers?, links? }
// Only the current month, and not after it is marked reviewed.
export const saveMyUpdate = async (req, res) => {
  const s = await myStudent(req.user);
  const month = thisMonth();
  const existing = await OjtUpdate.findOne({ student: s._id, month });
  if (existing?.status === "reviewed") throw new AppError("This month's update is already reviewed");

  const update = existing ?? new OjtUpdate({ student: s._id, batch: s.batch, month });
  Object.assign(update, updateFields(req.body));
  update.status = "submitted"; // a fixed "needs changes" update goes back for review
  await update.save();
  res.status(existing ? 200 : 201).json(update);
};

// GET /api/ojt/updates?batch=<id>&month=2026-11&status=submitted   (admin, hod)
export const listUpdates = async (req, res) => {
  const scope = await viewerScope(req.user);
  const filter = {};
  if (scope.batch) filter.batch = scope.batch;
  if (req.query.batch) {
    if (!mongoose.isValidObjectId(req.query.batch)) throw new AppError("Invalid batch");
    filter.batch = pickBatch(scope.batch, req.query.batch);
  }
  if (req.query.month) filter.month = req.query.month;
  if (req.query.status) filter.status = req.query.status;

  const updates = await OjtUpdate.find(filter)
    .populate({ path: "student", select: "rollNumber user", populate: { path: "user", select: "name" } })
    .populate("batch", "name")
    .sort({ month: -1, updatedAt: 1 })
    .limit(300);
  res.json(updates);
};

// PATCH /api/ojt/updates/:id/review   (admin, hod)  Body: { status: "reviewed" | "needs_changes", feedback? }
export const reviewUpdate = async (req, res) => {
  const { status, feedback } = req.body;
  if (!["reviewed", "needs_changes"].includes(status)) throw new AppError("Status must be reviewed or needs_changes");
  if (status === "needs_changes" && !feedback?.trim()) throw new AppError("Tell the student what to change");

  const scope = await viewerScope(req.user);
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Update not found", 404);
  const update = await OjtUpdate.findOne({ _id: req.params.id, ...(scope.batch ? { batch: scope.batch } : {}) });
  if (!update) throw new AppError("Update not found", 404);

  update.status = status;
  update.feedback = feedback?.trim() || undefined;
  update.reviewedBy = req.user._id;
  update.reviewedAt = new Date();
  await update.save();
  res.json(update);
};

// ---------- Viva, meetings and deadlines ----------

const withEventDetails = (query) => query.populate("batch", "name").populate("department", "code").populate("postedBy", "name");

// GET /api/ojt/events?upcoming=true&batch=<id>
export const listEvents = async (req, res) => {
  const scope = await scopeFor(req.user);
  const filter = {};
  if (scope.batch) filter.batch = scope.batch;
  if (req.query.batch && req.user.role !== "student") {
    if (!mongoose.isValidObjectId(req.query.batch)) throw new AppError("Invalid batch");
    filter.batch = pickBatch(scope.batch, req.query.batch);
  }
  // "Upcoming" keeps today's events visible all day
  if (req.query.upcoming === "true") filter.startsAt = { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) };
  res.json(await withEventDetails(OjtEvent.find(filter).sort({ startsAt: 1 }).limit(200)));
};

const eventFields = (body) => {
  const keys = ["type", "title", "startsAt", "place", "link", "details"];
  const data = Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  for (const k of ["place", "link", "details"]) if (data[k] === "") data[k] = undefined;
  return data;
};

const checkBatch = async (batchId, user) => {
  if (!mongoose.isValidObjectId(batchId)) throw new AppError("Pick a batch");
  const b = await Batch.findById(batchId);
  if (!b) throw new AppError("Pick a batch");
  if (user.role === "hod") {
    const scope = await viewerScope(user);
    if (!scope.batch.$in.some((id) => String(id) === String(b._id))) {
      throw new AppError("You can only add dates for your own department", 403);
    }
  }
  return b;
};

// POST /api/ojt/events   (admin, hod)  Body: { batch, type, title, startsAt, place?, link?, details? }
export const addEvent = async (req, res) => {
  const b = await checkBatch(req.body.batch, req.user);
  const event = await OjtEvent.create({ ...eventFields(req.body), batch: b._id, department: b.department, postedBy: req.user._id });
  res.status(201).json(await withEventDetails(OjtEvent.findById(event._id)));
};

const findEditableEvent = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Event not found", 404);
  const event = await OjtEvent.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);
  if (req.user.role !== "admin" && String(event.postedBy) !== String(req.user._id)) {
    throw new AppError("You can only change dates you added", 403);
  }
  return event;
};

// PATCH /api/ojt/events/:id   (admin, hod)
export const updateEvent = async (req, res) => {
  const event = await findEditableEvent(req);
  Object.assign(event, eventFields(req.body));
  await event.save();
  res.json(await withEventDetails(OjtEvent.findById(event._id)));
};

// DELETE /api/ojt/events/:id   (admin, hod)
export const deleteEvent = async (req, res) => {
  const event = await findEditableEvent(req);
  await event.deleteOne();
  res.json({ message: "Event deleted" });
};
