import Notice from "../models/Notice.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { visibleTo, checkAudience } from "../utils/audience.js";

const withDetails = (query) =>
  query
    .populate("department", "name code")
    .populate("batch", "name")
    .populate("postedBy", "name role");

const pick = (body) => {
  const keys = ["title", "body", "link", "audience", "department", "batch", "category", "important", "pinned"];
  const data = Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  if (data.link === "") data.link = undefined;
  return data;
};

// GET /api/notices?category=ojt   Pinned first, then newest. Each one says if it is new for you.
export const listNotices = async (req, res) => {
  const filter = await visibleTo(req.user);
  if (["general", "ojt"].includes(req.query.category)) filter.category = req.query.category;
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
