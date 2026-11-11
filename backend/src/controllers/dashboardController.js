import Student from "../models/Student.js";
import Course from "../models/Course.js";
import TimetableSlot, { DAYS } from "../models/TimetableSlot.js";
import AttendanceSession from "../models/AttendanceSession.js";
import Attendance from "../models/Attendance.js";
import Activity from "../models/Activity.js";
import Notice from "../models/Notice.js";
import Session from "../models/Session.js";
import OjtEvent from "../models/OjtEvent.js";
import OjtUpdate from "../models/OjtUpdate.js";
import Internship from "../models/Internship.js";
import AppError from "../utils/AppError.js";
import { visibleTo } from "../utils/audience.js";
import { viewerScope } from "../utils/viewer.js";
import mongoose from "mongoose";
import Batch from "../models/Batch.js";
import { thisMonth } from "./ojtController.js";

const RECENT = 12; // how many recent classes to show per subject
const DAY_MS = 86400000;
const IST_DAY_END_MS = (24 - 5.5) * 3600000; // same rule as internships

// Time now in India as "HH:MM", and today's short day name ("Mon")
const indiaNow = () => {
  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  const day = now.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" });
  return { time, day };
};

// GET /api/dashboard/student   Everything the student home screen needs, in one call
export const studentDashboard = async (req, res) => {
  const student = await Student.findOne({ user: req.user._id }).populate("batch", "name currentSemester").populate("department", "name code");
  if (!student) throw new AppError("Student profile not found", 404);
  const batchId = student.batch._id;
  const { time, day } = indiaNow();
  const audience = await visibleTo(req.user);
  const now = new Date();

  const [courses, todaySlots, sessions, myRecords, myActivities, batchTotals, notices, unread, upcomingSessions, ojtEvents, ojtUpdate, internships] =
    await Promise.all([
      Course.find({ batch: batchId }).populate({ path: "teacher", select: "user", populate: { path: "user", select: "name" } }).sort({ code: 1 }),
      DAYS.includes(day) ? TimetableSlot.find({ batch: batchId, day }).populate("course", "code name").sort({ startTime: 1 }) : [],
      AttendanceSession.find({ batch: batchId }).sort({ startedAt: 1 }).select("course startedAt"),
      Attendance.find({ student: student._id }).select("session"),
      Activity.find({ student: student._id }).select("approvedPoints"),
      Activity.aggregate([
        { $match: { batch: batchId, approvedPoints: { $gt: 0 } } },
        { $group: { _id: "$student", points: { $sum: "$approvedPoints" } } },
      ]),
      Notice.find(audience).sort({ pinned: -1, createdAt: -1 }).limit(4).populate("postedBy", "name"),
      Notice.countDocuments({ ...audience, createdAt: { $gt: req.user.noticesSeenAt || new Date(0) }, postedBy: { $ne: req.user._id } }),
      Session.find({ ...audience, startsAt: { $gte: new Date(now.getTime() - 3 * 3600000) } }).sort({ startsAt: 1 }).limit(5),
      OjtEvent.find({ batch: batchId, startsAt: { $gte: new Date(now.getTime() - 12 * 3600000) } }).sort({ startsAt: 1 }).limit(5),
      OjtUpdate.findOne({ student: student._id, month: thisMonth() }).select("status"),
      Internship.find({ ...audience, deadline: { $gte: new Date(now.getTime() - IST_DAY_END_MS), $lte: new Date(now.getTime() + 7 * DAY_MS) } })
        .sort({ deadline: 1 })
        .select("role company deadline applied"),
    ]);

  // Attendance per subject, with the last 12 classes as "P"/"A" marks (oldest first)
  const presentIn = new Set(myRecords.map((r) => String(r.session)));
  const subjects = courses.map((c) => {
    const held = sessions.filter((s) => String(s.course) === String(c._id));
    const attended = held.filter((s) => presentIn.has(String(s._id))).length;
    return {
      code: c.code,
      name: c.name,
      teacher: c.teacher?.user?.name ?? "Teacher not assigned",
      attended,
      total: held.length,
      recent: held.slice(-RECENT).map((s) => (presentIn.has(String(s._id)) ? "P" : "A")).join(""),
    };
  });

  // Impact score and rank (same points = same rank)
  const score = myActivities.reduce((sum, a) => sum + a.approvedPoints, 0);
  const rank = batchTotals.filter((t) => t.points > score).length + 1;

  // One "Coming up" list: sessions, OJT dates and internships closing this week that I haven't applied to
  const comingUp = [
    ...upcomingSessions.map((s) => ({ kind: "session", title: s.title, date: s.startsAt, detail: s.place || (s.link ? "Online" : ""), link: "/student/sessions" })),
    ...ojtEvents.map((e) => ({ kind: `ojt_${e.type}`, title: e.title, date: e.startsAt, detail: e.place || "OJT", link: "/student/ojt" })),
    ...internships
      .filter((i) => !i.applied.some((id) => String(id) === String(student._id)))
      .map((i) => ({ kind: "internship", title: `Apply: ${i.role}, ${i.company}`, date: i.deadline, detail: "Last date to apply", link: "/student/internships" })),
  ]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6);

  res.json({
    me: {
      name: req.user.name,
      rollNumber: student.rollNumber,
      batch: student.batch.name,
      department: student.department?.name,
      semester: student.batch.currentSemester,
    },
    now: time,
    today: todaySlots.map((s) => ({
      start: s.startTime,
      end: s.endTime,
      label: s.course?.code,
      title: s.course?.name,
      place: s.room || "",
    })),
    subjects,
    impact: { score, rank, outOf: await Student.countDocuments({ batch: batchId }) },
    notices: notices.map((n) => ({
      _id: n._id,
      title: n.title,
      important: n.important,
      postedBy: n.postedBy?.name,
      createdAt: n.createdAt,
      isNew: n.createdAt > (req.user.noticesSeenAt || new Date(0)) && String(n.postedBy?._id) !== String(req.user._id),
    })),
    unreadNotices: unread,
    ojtUpdate: ojtUpdate?.status ?? "not_sent",
    comingUp,
  });
};

const MIN = 0.75;
const pct = (a, h) => (h ? Math.round((a / h) * 100) : null);

// GET /api/dashboard/batch?batch=<id>   (batch manager, hod, admin)
// One batch at a glance: who is below 75%, what is waiting for review, OJT updates, impact scores.
// Without ?batch it uses the first batch the person can see.
export const batchDashboard = async (req, res) => {
  const scope = await viewerScope(req.user);
  const allowed = scope.batch ? scope.batch.$in.map(String) : null; // null = admin, any batch
  let batchId = req.query.batch;
  if (batchId && !mongoose.isValidObjectId(batchId)) throw new AppError("Invalid batch");
  if (!batchId) {
    const first = await Batch.findOne(allowed ? { _id: { $in: allowed } } : {}).sort({ name: 1 });
    if (!first) return res.json({ batch: null });
    batchId = String(first._id);
  }
  if (allowed && !allowed.includes(String(batchId))) throw new AppError("This is not one of your batches", 403);

  const batch = await Batch.findById(batchId).populate("department", "name code");
  if (!batch) throw new AppError("Batch not found", 404);
  const month = thisMonth();

  const [students, courses, sessions, activities, ojtUpdates, upcoming] = await Promise.all([
    Student.find({ batch: batch._id }).populate("user", "name isActive").sort({ rollNumber: 1 }),
    Course.find({ batch: batch._id }).populate({ path: "teacher", select: "user", populate: { path: "user", select: "name" } }).sort({ code: 1 }),
    AttendanceSession.find({ batch: batch._id }).select("course"),
    Activity.find({ batch: batch._id }).select("student status approvedPoints"),
    OjtUpdate.find({ batch: batch._id, month }).select("student status"),
    OjtEvent.find({ batch: batch._id, startsAt: { $gte: new Date(Date.now() - 12 * 3600000) } }).sort({ startsAt: 1 }).limit(3),
  ]);
  const records = await Attendance.find({ session: { $in: sessions.map((x) => x._id) } }).select("student course");

  // How many classes each course has held, and how many each student attended per course
  const heldBy = new Map();
  for (const x of sessions) heldBy.set(String(x.course), (heldBy.get(String(x.course)) || 0) + 1);
  const attended = new Map(); // "student:course" -> count
  for (const r of records) {
    const key = `${r.student}:${r.course}`;
    attended.set(key, (attended.get(key) || 0) + 1);
  }

  const points = new Map();
  for (const a of activities) points.set(String(a.student), (points.get(String(a.student)) || 0) + a.approvedPoints);
  const ojtBy = new Map(ojtUpdates.map((u) => [String(u.student), u.status]));

  const active = students.filter((st) => st.user?.isActive !== false);
  const rows = active.map((st) => {
    let a = 0;
    let h = 0;
    const low = [];
    for (const c of courses) {
      const held = heldBy.get(String(c._id)) || 0;
      const got = attended.get(`${st._id}:${c._id}`) || 0;
      a += got;
      h += held;
      if (held && got / held < MIN) low.push(c.code);
    }
    return {
      _id: st._id,
      name: st.user?.name,
      rollNumber: st.rollNumber,
      attendance: pct(a, h),
      lowSubjects: low,
      impact: points.get(String(st._id)) || 0,
      ojt: ojtBy.get(String(st._id)) ?? "not_sent",
    };
  });
  // Worst attendance first, students with no classes yet at the end
  rows.sort((x, y) => (x.attendance ?? 101) - (y.attendance ?? 101) || x.rollNumber.localeCompare(y.rollNumber));

  const subjects = courses.map((c) => {
    const held = heldBy.get(String(c._id)) || 0;
    const total = active.reduce((sum, st) => sum + (attended.get(`${st._id}:${c._id}`) || 0), 0);
    return {
      code: c.code,
      name: c.name,
      teacher: c.teacher?.user?.name ?? null,
      held,
      average: held && active.length ? Math.round((total / (held * active.length)) * 100) : null,
    };
  });

  const top = [...rows]
    .filter((r) => r.impact > 0)
    .sort((x, y) => y.impact - x.impact)
    .slice(0, 5)
    .map((r) => ({ name: r.name, rollNumber: r.rollNumber, impact: r.impact, rank: rows.filter((o) => o.impact > r.impact).length + 1 }));

  res.json({
    batch: { _id: batch._id, name: batch.name, department: batch.department, semester: batch.currentSemester },
    month,
    counts: {
      students: active.length,
      belowMinimum: rows.filter((r) => r.lowSubjects.length > 0).length,
      activitiesToReview: activities.filter((a) => a.status === "pending").length,
      ojtToReview: ojtUpdates.filter((u) => u.status === "submitted").length,
      ojtNotSent: rows.filter((r) => r.ojt === "not_sent").length,
    },
    students: rows,
    subjects,
    top,
    upcoming: upcoming.map((e) => ({ _id: e._id, type: e.type, title: e.title, startsAt: e.startsAt, place: e.place })),
  });
};
