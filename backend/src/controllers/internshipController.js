import mongoose from "mongoose";
import Internship from "../models/Internship.js";
import Student from "../models/Student.js";
import AppError from "../utils/AppError.js";
import { visibleTo, checkAudience } from "../utils/audience.js";

const withDetails = (query) =>
  query.populate("department", "name code").populate("batch", "name").populate("postedBy", "name");

const pick = (body) => {
  const keys = ["role", "company", "mode", "location", "stipend", "duration", "eligibility", "details", "applyLink", "deadline", "audience", "department", "batch"];
  const data = Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  for (const k of ["location", "stipend", "duration", "eligibility", "details"]) if (data[k] === "") data[k] = undefined;
  return data;
};

// The deadline is a date like 2026-11-20 (stored as midnight UTC).
// Applications stay open until 11:59 PM India time on that day, which is 18.5 hours after midnight UTC.
const IST_DAY_END_MS = (24 - 5.5) * 3600000;
const isOpen = (deadline) => new Date(deadline).getTime() + IST_DAY_END_MS > Date.now();

// Students get "youApplied", staff get the count. The list of who applied is never sent to students.
const shape = (doc, user, myStudentId) => {
  const { applied, ...rest } = doc.toJSON();
  const out = { ...rest, isOpen: isOpen(doc.deadline) };
  if (user.role === "student") out.youApplied = applied.some((id) => String(id) === String(myStudentId));
  else out.appliedCount = applied.length;
  return out;
};

const myStudentId = async (user) => (user.role === "student" ? (await Student.findOne({ user: user._id }))?._id : null);

// GET /api/internships?status=open|closed
export const listInternships = async (req, res) => {
  const filter = await visibleTo(req.user);
  const list = await withDetails(Internship.find(filter).sort({ deadline: 1 }).limit(300));
  const me = await myStudentId(req.user);
  let shaped = list.map((i) => shape(i, req.user, me));
  if (req.query.status === "open") shaped = shaped.filter((i) => i.isOpen);
  if (req.query.status === "closed") shaped = shaped.filter((i) => !i.isOpen).reverse();
  res.json(shaped);
};

// POST /api/internships   (admin, hod)
export const addInternship = async (req, res) => {
  const data = { audience: "all", ...pick(req.body) };
  await checkAudience(data, req.user);
  const internship = await Internship.create({ ...data, postedBy: req.user._id });
  res.status(201).json(shape(await withDetails(Internship.findById(internship._id)), req.user));
};

const findEditable = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Internship not found", 404);
  const internship = await Internship.findById(req.params.id);
  if (!internship) throw new AppError("Internship not found", 404);
  if (req.user.role !== "admin" && String(internship.postedBy) !== String(req.user._id)) {
    throw new AppError("You can only change internships you posted", 403);
  }
  return internship;
};

// PATCH /api/internships/:id   (admin, hod)
export const updateInternship = async (req, res) => {
  const internship = await findEditable(req);
  const data = pick(req.body);
  if (data.audience || data.department || data.batch) {
    const merged = {
      audience: data.audience ?? internship.audience,
      department: data.department ?? internship.department,
      batch: data.batch ?? internship.batch,
    };
    await checkAudience(merged, req.user);
    Object.assign(data, merged);
  }
  Object.assign(internship, data);
  await internship.save();
  res.json(shape(await withDetails(Internship.findById(internship._id)), req.user));
};

// DELETE /api/internships/:id   (admin, hod)
export const deleteInternship = async (req, res) => {
  const internship = await findEditable(req);
  await internship.deleteOne();
  res.json({ message: "Internship deleted" });
};

// POST /api/internships/:id/applied   (student)  Body: { applied: true | false }
export const markApplied = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Internship not found", 404);
  const student = await Student.findOne({ user: req.user._id });
  if (!student) throw new AppError("Student profile not found", 404);
  // Only internships this student can see
  const internship = await Internship.findOne({ _id: req.params.id, ...(await visibleTo(req.user)) });
  if (!internship) throw new AppError("Internship not found", 404);

  const update = req.body.applied ? { $addToSet: { applied: student._id } } : { $pull: { applied: student._id } };
  await Internship.updateOne({ _id: internship._id }, update);
  res.json({ youApplied: Boolean(req.body.applied) });
};

// GET /api/internships/:id/applicants   (admin, hod)  Who said they applied
export const applicants = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Internship not found", 404);
  const internship = await Internship.findOne({ _id: req.params.id, ...(await visibleTo(req.user)) }).populate({
    path: "applied",
    select: "rollNumber user batch",
    populate: [{ path: "user", select: "name email" }, { path: "batch", select: "name" }],
  });
  if (!internship) throw new AppError("Internship not found", 404);
  res.json(
    internship.applied.map((s) => ({ _id: s._id, name: s.user?.name, email: s.user?.email, rollNumber: s.rollNumber, batch: s.batch?.name }))
  );
};
