import TimetableSlot, { DAYS } from "../models/TimetableSlot.js";
import Course from "../models/Course.js";
import AppError from "../utils/AppError.js";
import { viewerScope } from "../utils/viewer.js";

const withDetails = (query) =>
  query
    .populate("course", "name code")
    .populate("batch", "name")
    .populate({ path: "teacher", select: "employeeId user", populate: { path: "user", select: "name" } });

// Sort Mon..Sat, then by start time
const sortWeek = (slots) =>
  slots.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime));

// Two classes clash if they are on the same day, their times overlap,
// and they share the same batch, the same teacher, or the same room.
const findClash = async ({ day, startTime, endTime, batch, teacher, room }, ignoreId) => {
  const who = [{ batch }];
  if (teacher) who.push({ teacher });
  if (room) who.push({ room });

  const clash = await TimetableSlot.findOne({
    _id: { $ne: ignoreId },
    day,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    $or: who,
  }).populate("course", "code");

  if (!clash) return null;
  const reason =
    String(clash.batch) === String(batch) ? "this batch already has a class"
    : teacher && String(clash.teacher) === String(teacher) ? "this teacher already has a class"
    : `room ${room} is already booked`;
  return `Clash: ${reason} on ${day} ${clash.startTime}-${clash.endTime} (${clash.course?.code})`;
};

const checkSlot = async (data, ignoreId) => {
  if (data.startTime >= data.endTime) throw new AppError("End time must be after start time");
  const message = await findClash(data, ignoreId);
  if (message) throw new AppError(message, 409);
};

// GET /api/timetable?batch=<id>&teacher=<id>&day=Mon
// Students get their batch's week, teachers get their own classes.
export const getTimetable = async (req, res) => {
  const filter = await viewerScope(req.user);
  if (req.user.role === "admin") {
    if (req.query.batch) filter.batch = req.query.batch;
    if (req.query.teacher) filter.teacher = req.query.teacher;
  }
  if (req.query.day) filter.day = req.query.day;
  res.json(sortWeek(await withDetails(TimetableSlot.find(filter))));
};

// GET /api/timetable/today   (for the dashboards, uses India time)
export const getToday = async (req, res) => {
  const name = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" });
  if (!DAYS.includes(name)) return res.json({ day: name, slots: [] }); // Sunday
  const filter = { ...(await viewerScope(req.user)), day: name };
  res.json({ day: name, slots: sortWeek(await withDetails(TimetableSlot.find(filter))) });
};

// POST /api/timetable   Body: { course, day, startTime, endTime, room }
export const createSlot = async (req, res) => {
  const { course: courseId, day, startTime, endTime, room } = req.body;
  const course = await Course.findById(courseId);
  if (!course) throw new AppError("Course not found", 404);

  const data = { course: course._id, batch: course.batch, teacher: course.teacher, day, startTime, endTime, room };
  // Check format first so bad input gets a clear message before the clash check
  await new TimetableSlot(data).validate();
  await checkSlot(data);
  const slot = await TimetableSlot.create(data);
  res.status(201).json(await withDetails(TimetableSlot.findById(slot._id)));
};

// PATCH /api/timetable/:id   Body: any of { day, startTime, endTime, room }
export const updateSlot = async (req, res) => {
  const slot = await TimetableSlot.findById(req.params.id);
  if (!slot) throw new AppError("Slot not found", 404);
  for (const key of ["day", "startTime", "endTime", "room"]) {
    if (req.body[key] !== undefined) slot[key] = req.body[key];
  }
  await slot.validate();
  await checkSlot(slot, slot._id);
  await slot.save();
  res.json(await withDetails(TimetableSlot.findById(slot._id)));
};

// DELETE /api/timetable/:id
export const deleteSlot = async (req, res) => {
  const slot = await TimetableSlot.findByIdAndDelete(req.params.id);
  if (!slot) throw new AppError("Slot not found", 404);
  res.json({ message: "Slot deleted" });
};
