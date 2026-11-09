import Notice from "../models/Notice.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

const withDetails = (query) =>
  query
    .populate("department", "name code")
    .populate("batch", "name")
    .populate("postedBy", "name role");

// Which notices this person should see
const visibleTo = async (user) => {
  if (user.role === "admin") return {};
  if (user.role === "student") {
    const s = await Student.findOne({ user: user._id });
    if (!s) throw new AppError("Student profile not found", 404);
    return {
      $or: [
        { audience: "all" },
        { audience: "department", department: s.department },
        { audience: "batch", batch: s.batch },
      ],
    };
  }
  // teacher and hod: college wide + their department + its batches
  const t = await Teacher.findOne({ user: user._id });
  if (!t) throw new AppError("Teacher profile not found", 404);
  const batches = await Batch.find({ department: t.department }).select("_id");
  return {
    $or: [
      { audience: "all" },
      { audience: "department", department: t.department },
      { audience: "batch", batch: { $in: batches.map((b) => b._id) } },
    ],
  };
};

// Checks the audience fields and fills in the department for batch notices.
// An HOD can only post to their own department or its batches.
const checkAudience = async (data, user) => {
  if (data.audience === "all") {
    if (user.role === "hod") throw new AppError("HODs can post to their department or its batches only");
    data.department = undefined;
    data.batch = undefined;
  }
  if (data.audience === "batch") {
    const b = await Batch.findById(data.batch);
    if (!b) throw new AppError("Pick a batch");
    data.department = b.department;
  }
  if (data.audience === "department" && !data.department) throw new AppError("Pick a department");
  if (data.audience === "department") data.batch = undefined;

  if (user.role === "hod") {
    const t = await Teacher.findOne({ user: user._id });
    if (String(t?.department) !== String(data.department)) {
      throw new AppError("You can only post to your own department", 403);
    }
  }
};

const pick = (body) => {
  const keys = ["title", "body", "link", "audience", "department", "batch", "important", "pinned"];
  const data = Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  if (data.link === "") data.link = undefined;
  return data;
};

// GET /api/notices   Pinned first, then newest. Each one says if it is new for you.
export const listNotices = async (req, res) => {
  const filter = await visibleTo(req.user);
  const notices = await withDetails(Notice.find(filter).sort({ pinned: -1, createdAt: -1 }).limit(100));
  const seenAt = req.user.noticesSeenAt || new Date(0);
  res.json(
    notices.map((n) => ({
      ...n.toJSON(),
      isNew: n.createdAt > seenAt && String(n.postedBy?._id) !== String(req.user._id),
    }))
  );
};

// GET /api/notices/unread   Number of new notices (for the badge)
export const unreadCount = async (req, res) => {
  const filter = await visibleTo(req.user);
  const count = await Notice.countDocuments({
    ...filter,
    createdAt: { $gt: req.user.noticesSeenAt || new Date(0) },
    postedBy: { $ne: req.user._id },
  });
  res.json({ count });
};

// POST /api/notices/seen   Marks everything up to now as seen
export const markSeen = async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { noticesSeenAt: new Date() });
  res.json({ message: "Marked as seen" });
};

// POST /api/notices   (admin, hod)
export const createNotice = async (req, res) => {
  const data = { audience: "all", ...pick(req.body) };
  await checkAudience(data, req.user);
  const notice = await Notice.create({ ...data, postedBy: req.user._id });
  res.status(201).json(await withDetails(Notice.findById(notice._id)));
};

// Admin can change any notice, an HOD only their own
const findEditable = async (req) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) throw new AppError("Notice not found", 404);
  if (req.user.role !== "admin" && String(notice.postedBy) !== String(req.user._id)) {
    throw new AppError("You can only change notices you posted", 403);
  }
  return notice;
};

// PATCH /api/notices/:id   (admin, hod)  Edit, pin or unpin
export const updateNotice = async (req, res) => {
  const notice = await findEditable(req);
  const data = pick(req.body);
  if (data.audience || data.department || data.batch) {
    const merged = {
      audience: data.audience ?? notice.audience,
      department: data.department ?? notice.department,
      batch: data.batch ?? notice.batch,
    };
    await checkAudience(merged, req.user);
    Object.assign(data, merged);
  }
  Object.assign(notice, data);
  if (req.body.link === "") notice.link = undefined;
  await notice.save();
  res.json(await withDetails(Notice.findById(notice._id)));
};

// DELETE /api/notices/:id   (admin, hod)
export const deleteNotice = async (req, res) => {
  const notice = await findEditable(req);
  await notice.deleteOne();
  res.json({ message: "Notice deleted" });
};
