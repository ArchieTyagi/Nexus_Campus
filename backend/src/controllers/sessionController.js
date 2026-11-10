import mongoose from "mongoose";
import Session from "../models/Session.js";
import AppError from "../utils/AppError.js";
import { visibleTo, checkAudience } from "../utils/audience.js";

const withDetails = (query) =>
  query.populate("department", "name code").populate("batch", "name").populate("postedBy", "name");

const pick = (body) => {
  const keys = ["title", "kind", "speaker", "startsAt", "minutes", "place", "link", "details", "audience", "department", "batch"];
  const data = Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  for (const k of ["speaker", "place", "link", "details"]) if (data[k] === "") data[k] = undefined;
  return data;
};

// GET /api/sessions?when=upcoming|past
// Upcoming = not finished yet (soonest first). Past = finished (newest first).
export const listSessions = async (req, res) => {
  const filter = await visibleTo(req.user);
  const sessions = await withDetails(Session.find(filter).sort({ startsAt: 1 }).limit(300));
  const now = Date.now();
  const endOf = (s) => new Date(s.startsAt).getTime() + (s.minutes || 60) * 60000;
  if (req.query.when === "upcoming") return res.json(sessions.filter((s) => endOf(s) >= now));
  if (req.query.when === "past") return res.json(sessions.filter((s) => endOf(s) < now).reverse());
  res.json(sessions);
};

// POST /api/sessions   (admin, hod)
export const addSession = async (req, res) => {
  const data = { audience: "all", ...pick(req.body) };
  await checkAudience(data, req.user);
  const session = await Session.create({ ...data, postedBy: req.user._id });
  res.status(201).json(await withDetails(Session.findById(session._id)));
};

const findEditable = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Session not found", 404);
  const session = await Session.findById(req.params.id);
  if (!session) throw new AppError("Session not found", 404);
  if (req.user.role !== "admin" && String(session.postedBy) !== String(req.user._id)) {
    throw new AppError("You can only change sessions you posted", 403);
  }
  return session;
};

// PATCH /api/sessions/:id   (admin, hod)
export const updateSession = async (req, res) => {
  const session = await findEditable(req);
  const data = pick(req.body);
  if (data.audience || data.department || data.batch) {
    const merged = {
      audience: data.audience ?? session.audience,
      department: data.department ?? session.department,
      batch: data.batch ?? session.batch,
    };
    await checkAudience(merged, req.user);
    Object.assign(data, merged);
  }
  Object.assign(session, data);
  await session.save();
  res.json(await withDetails(Session.findById(session._id)));
};

// DELETE /api/sessions/:id   (admin, hod)
export const deleteSession = async (req, res) => {
  const session = await findEditable(req);
  await session.deleteOne();
  res.json({ message: "Session deleted" });
};
