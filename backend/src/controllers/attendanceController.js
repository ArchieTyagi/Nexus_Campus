import crypto from "crypto";
import mongoose from "mongoose";
import AttendanceSession, { SESSION_MINUTES } from "../models/AttendanceSession.js";
import Attendance from "../models/Attendance.js";
import Course from "../models/Course.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import AppError from "../utils/AppError.js";
import { currentQr, parseQr, isValidCode } from "../utils/qr.js";

const MINIMUM = 0.75;

// Who may run attendance for a course: its teacher, an HOD of that department, or admin
const canRun = async (user, course) => {
  if (user.role === "admin") return true;
  const t = await Teacher.findOne({ user: user._id });
  if (!t) return false;
  if (course.teacher && String(course.teacher) === String(t._id)) return true;
  return user.role === "hod" && String(course.department) === String(t.department);
};

const findMySession = async (req, withSecret = false) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Session not found", 404);
  const query = AttendanceSession.findById(req.params.id);
  const session = await (withSecret ? query.select("+secret") : query);
  if (!session) throw new AppError("Session not found", 404);
  const course = await Course.findById(session.course);
  if (!(await canRun(req.user, course))) throw new AppError("This is not your class", 403);
  return { session, course };
};

const counts = async (session) => {
  const [present, total] = await Promise.all([
    Attendance.countDocuments({ session: session._id }),
    Student.countDocuments({ batch: session.batch }),
  ]);
  return { present, total };
};

// GET /api/attendance/courses   (teacher, hod, admin)  Courses this person can take attendance for
export const myCourses = async (req, res) => {
  let filter = {};
  if (req.user.role !== "admin") {
    const t = await Teacher.findOne({ user: req.user._id });
    if (!t) throw new AppError("Teacher profile not found", 404);
    filter = req.user.role === "hod" ? { department: t.department } : { teacher: t._id };
  }
  const courses = await Course.find(filter).populate("batch", "name").sort({ code: 1 });
  res.json(courses);
};

// POST /api/attendance/sessions   Body: { course }
// Starts a 10 minute QR session. If one is already open for this course, returns that one.
export const startSession = async (req, res) => {
  if (!mongoose.isValidObjectId(req.body.course)) throw new AppError("Pick a course");
  const course = await Course.findById(req.body.course);
  if (!course) throw new AppError("Course not found", 404);
  if (!(await canRun(req.user, course))) throw new AppError("This is not your class", 403);

  const open = await AttendanceSession.findOne({ course: course._id, closedAt: null, endsAt: { $gt: new Date() } });
  if (open) return res.json({ session: open, ...(await counts(open)) });

  const startedAt = new Date();
  const session = await AttendanceSession.create({
    course: course._id,
    batch: course.batch,
    teacher: course.teacher,
    startedBy: req.user._id,
    startedAt,
    endsAt: new Date(startedAt.getTime() + SESSION_MINUTES * 60 * 1000),
    secret: crypto.randomBytes(32).toString("hex"),
  });
  res.status(201).json({ session, ...(await counts(session)) });
};

// GET /api/attendance/sessions/:id/qr   The current QR code and live count (the teacher's screen polls this)
export const sessionQr = async (req, res) => {
  const { session } = await findMySession(req, true);
  const live = await counts(session);
  if (!session.isOpen) return res.json({ isOpen: false, ...live });
  res.json({ isOpen: true, qr: currentQr(session.secret, String(session._id)), endsAt: session.endsAt, ...live });
};

// GET /api/attendance/sessions/:id   Session with every student and whether they are present
export const sessionDetail = async (req, res) => {
  const { session, course } = await findMySession(req);
  const [students, records] = await Promise.all([
    Student.find({ batch: session.batch }).populate("user", "name").sort({ rollNumber: 1 }),
    Attendance.find({ session: session._id }),
  ]);
  const byStudent = new Map(records.map((r) => [String(r.student), r]));
  res.json({
    session,
    course: { _id: course._id, code: course.code, name: course.name },
    students: students.map((s) => ({
      _id: s._id,
      name: s.user?.name,
      rollNumber: s.rollNumber,
      present: byStudent.has(String(s._id)),
      markedBy: byStudent.get(String(s._id))?.markedBy ?? null,
    })),
  });
};

// POST /api/attendance/sessions/:id/close
export const closeSession = async (req, res) => {
  const { session } = await findMySession(req);
  if (!session.closedAt) {
    session.closedAt = new Date();
    await session.save();
  }
  res.json({ session, ...(await counts(session)) });
};

// POST /api/attendance/sessions/:id/mark   Body: { student, present }
// The teacher marks someone by hand (phone dead, camera broken). Works after the session closes too.
export const markByHand = async (req, res) => {
  const { session } = await findMySession(req);
  const { student, present } = req.body;
  if (!mongoose.isValidObjectId(student)) throw new AppError("Pick a student");
  const s = await Student.findOne({ _id: student, batch: session.batch });
  if (!s) throw new AppError("This student is not in this batch", 404);

  if (present) {
    await Attendance.updateOne(
      { session: session._id, student: s._id },
      { $setOnInsert: { course: session.course, markedBy: "teacher" } },
      { upsert: true }
    );
  } else {
    await Attendance.deleteOne({ session: session._id, student: s._id });
  }
  // "marked" = this student now, "present" = how many are present in total
  res.json({ student: s._id, marked: Boolean(present), ...(await counts(session)) });
};

// POST /api/attendance/scan   (student)  Body: { qr }
export const scan = async (req, res) => {
  const parsed = parseQr(req.body.qr);
  if (!parsed) throw new AppError("This is not a Nexus Campus attendance QR");

  const session = await AttendanceSession.findById(parsed.sessionId).select("+secret").populate("course", "code name");
  if (!session) throw new AppError("This attendance session does not exist", 404);
  if (!session.isOpen) throw new AppError("Attendance for this class is closed");
  if (!isValidCode(session.secret, String(session._id), parsed.code)) {
    throw new AppError("This QR has expired. Scan the one on the screen now.");
  }

  const student = await Student.findOne({ user: req.user._id });
  if (!student) throw new AppError("Student profile not found", 404);
  if (String(student.batch) !== String(session.batch)) throw new AppError("This class is not for your batch", 403);

  const result = await Attendance.updateOne(
    { session: session._id, student: student._id },
    { $setOnInsert: { course: session.course._id, markedBy: "qr" } },
    { upsert: true }
  );
  res.json({
    message: result.upsertedCount ? "You are marked present" : "You were already marked present",
    alreadyMarked: !result.upsertedCount,
    course: session.course,
  });
};

// How many classes a student can miss, or must attend, to stay at 75%
const advice = (attended, held) => {
  if (held === 0) return { percent: null, ok: true, message: "No classes yet" };
  const percent = Math.round((attended / held) * 100);
  if (attended / held >= MINIMUM) {
    const canMiss = Math.floor(attended / MINIMUM - held);
    return {
      percent,
      ok: true,
      message: canMiss > 0 ? `You can miss ${canMiss} more ${canMiss === 1 ? "class" : "classes"}` : "Attend every class to stay above 75%",
    };
  }
  const needed = Math.ceil((MINIMUM * held - attended) / (1 - MINIMUM));
  return { percent, ok: false, message: `Attend the next ${needed} ${needed === 1 ? "class" : "classes"} to reach 75%` };
};

// GET /api/attendance/mine   (student)  Attendance per course plus overall
export const myAttendance = async (req, res) => {
  const student = await Student.findOne({ user: req.user._id });
  if (!student) throw new AppError("Student profile not found", 404);

  const [courses, held, attended, recent] = await Promise.all([
    Course.find({ batch: student.batch }).populate({ path: "teacher", select: "user", populate: { path: "user", select: "name" } }).sort({ code: 1 }),
    AttendanceSession.aggregate([{ $match: { batch: student.batch } }, { $group: { _id: "$course", n: { $sum: 1 } } }]),
    Attendance.aggregate([{ $match: { student: student._id } }, { $group: { _id: "$course", n: { $sum: 1 } } }]),
    AttendanceSession.find({ batch: student.batch }).sort({ startedAt: -1 }).limit(15).populate("course", "code"),
  ]);
  const heldBy = new Map(held.map((h) => [String(h._id), h.n]));
  const attendedBy = new Map(attended.map((a) => [String(a._id), a.n]));
  const presentIn = new Set(
    (await Attendance.find({ student: student._id, session: { $in: recent.map((r) => r._id) } })).map((a) => String(a.session))
  );

  const perCourse = courses.map((c) => {
    const h = heldBy.get(String(c._id)) || 0;
    const a = attendedBy.get(String(c._id)) || 0;
    return { course: { _id: c._id, code: c.code, name: c.name, teacher: c.teacher?.user?.name ?? null }, held: h, attended: a, ...advice(a, h) };
  });
  const totalHeld = perCourse.reduce((s, c) => s + c.held, 0);
  const totalAttended = perCourse.reduce((s, c) => s + c.attended, 0);

  res.json({
    overall: { held: totalHeld, attended: totalAttended, ...advice(totalAttended, totalHeld) },
    courses: perCourse,
    recent: recent.map((r) => ({ _id: r._id, course: r.course?.code, startedAt: r.startedAt, present: presentIn.has(String(r._id)) })),
  });
};
