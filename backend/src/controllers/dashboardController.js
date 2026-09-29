import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
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

// When today started in India (midnight IST), as a Date
const IST_MS = 5.5 * 3600000;
const indiaMidnight = () => new Date(Math.floor((Date.now() + IST_MS) / DAY_MS) * DAY_MS - IST_MS);

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

// GET /api/dashboard/teacher   (teacher, hod)  The teacher home screen in one call:
// today's classes, an attendance session still running, each course's attendance, and students below 75%.
export const teacherDashboard = async (req, res) => {
  const teacher = await Teacher.findOne({ user: req.user._id }).populate("department", "name code");
  if (!teacher) throw new AppError("Teacher profile not found", 404);
  const { time, day } = indiaNow();
  const audience = await visibleTo(req.user);

  const courses = await Course.find({ teacher: teacher._id }).populate("batch", "name").sort({ code: 1 });
  const courseIds = courses.map((c) => c._id);
  const batchIds = [...new Set(courses.map((c) => String(c.batch?._id)).filter(Boolean))];

  const [todaySlots, sessions, marks, students, open, notices, unread] = await Promise.all([
    DAYS.includes(day)
      ? TimetableSlot.find({ teacher: teacher._id, day }).populate("course", "code name").populate("batch", "name").sort({ startTime: 1 })
      : [],
    AttendanceSession.find({ course: { $in: courseIds } }).select("course startedAt"),
    // How many classes each student attended, per course
    Attendance.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: { course: "$course", student: "$student" }, n: { $sum: 1 } } },
    ]),
    Student.find({ batch: { $in: batchIds } }).populate("user", "name isActive").select("rollNumber batch user"),
    AttendanceSession.findOne({ course: { $in: courseIds }, closedAt: null, endsAt: { $gt: new Date() } }).populate("course", "code"),
    Notice.find(audience).sort({ pinned: -1, createdAt: -1 }).limit(3).populate("postedBy", "name"),
    Notice.countDocuments({ ...audience, createdAt: { $gt: req.user.noticesSeenAt || new Date(0) }, postedBy: { $ne: req.user._id } }),
  ]);

  const attendedBy = new Map(marks.map((m) => [`${m._id.course}:${m._id.student}`, m.n]));

  // Attendance already taken today (India time) for each course: the latest session and how many were present
  const todaySessions = sessions.filter((s) => s.startedAt >= indiaMidnight());
  const presentToday = await Attendance.aggregate([
    { $match: { session: { $in: todaySessions.map((s) => s._id) } } },
    { $group: { _id: "$session", n: { $sum: 1 } } },
  ]);
  const presentIn = new Map(presentToday.map((p) => [String(p._id), p.n]));
  const takenToday = (courseId) => {
    const latest = todaySessions
      .filter((s) => String(s.course) === String(courseId))
      .sort((a, b) => b.startedAt - a.startedAt)[0];
    if (!latest) return null;
    const course = courses.find((c) => String(c._id) === String(courseId));
    return { present: presentIn.get(String(latest._id)) || 0, total: activeIn(course?.batch?._id).length, at: latest.startedAt };
  };
  // Deactivated students are left out of every number
  const activeIn = (batchId) => students.filter((s) => s.user?.isActive && String(s.batch) === String(batchId));

  const watch = [];
  const perCourse = courses.map((c) => {
    const held = sessions.filter((s) => String(s.course) === String(c._id));
    const lastClass = held.reduce((last, s) => (!last || s.startedAt > last ? s.startedAt : last), null);
    const list = activeIn(c.batch?._id);
    let totalAttended = 0;
    let below = 0;
    for (const s of list) {
      const attended = attendedBy.get(`${c._id}:${s._id}`) || 0;
      totalAttended += attended;
      if (held.length > 0 && attended / held.length < MIN) {
        below++;
        watch.push({
          name: s.user.name,
          rollNumber: s.rollNumber,
          course: c.code,
          attended,
          held: held.length,
          percent: pct(attended, held.length),
          // Classes in a row needed to get back to 75%: (a + n) / (h + n) >= 0.75 means n >= 3h - 4a
          toRecover: 3 * held.length - 4 * attended,
        });
      }
    }
    return {
      _id: c._id,
      code: c.code,
      name: c.name,
      batch: c.batch?.name ?? "",
      students: list.length,
      held: held.length,
      average: pct(totalAttended, held.length * list.length),
      below,
      lastClass,
    };
  });
  watch.sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name));

  res.json({
    me: { name: req.user.name, employeeId: teacher.employeeId, department: teacher.department?.name ?? "" },
    now: time,
    today: todaySlots.map((s) => ({
      start: s.startTime,
      end: s.endTime,
      label: s.course?.code,
      title: s.course?.name,
      place: [s.batch?.name, s.room].filter(Boolean).join(" · "),
      course: s.course?._id,
      taken: s.course ? takenToday(s.course._id) : null,
    })),
    openSession: open ? { _id: open._id, course: open.course?.code, courseId: open.course?._id, endsAt: open.endsAt } : null,
    courses: perCourse,
    watch,
    stats: {
      classesToday: todaySlots.length,
      courses: courses.length,
      students: batchIds.reduce((n, b) => n + activeIn(b).length, 0),
      below: watch.length,
    },
    notices: notices.map((n) => ({ _id: n._id, title: n.title, important: n.important, postedBy: n.postedBy?.name, createdAt: n.createdAt })),
    unreadNotices: unread,
  });
};

// GET /api/dashboard/admin   (admin)  The whole college at a glance:
// numbers, things that need fixing, each department's attendance, classes running now, latest notices.
export const adminDashboard = async (req, res) => {
  const { time, day } = indiaNow();
  const audience = await visibleTo(req.user);
  const since = indiaMidnight();
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const nowMin = toMin(time);

  const [departments, batches, students, teachers, slots, todaySessions, heldByBatch, marks, noTeacher, tempUsers, pendingActivities, pendingOjt, notices, unread] =
    await Promise.all([
      Department.find().sort({ name: 1 }),
      Batch.find().populate("department", "code").sort({ name: 1 }),
      Student.find().populate("user", "isActive").select("batch department user"),
      Teacher.find().populate("user", "isActive role").select("department user"),
      DAYS.includes(day)
        ? TimetableSlot.find({ day })
            .populate("course", "code name")
            .populate("batch", "name")
            .populate({ path: "teacher", select: "user", populate: { path: "user", select: "name" } })
            .sort({ startTime: 1 })
        : [],
      AttendanceSession.find({ startedAt: { $gte: since } }).select("course startedAt endsAt closedAt"),
      AttendanceSession.aggregate([{ $group: { _id: "$batch", n: { $sum: 1 } } }]),
      Attendance.aggregate([{ $group: { _id: "$student", n: { $sum: 1 } } }]),
      Course.find({ teacher: null }).populate("batch", "name").select("code batch").sort({ code: 1 }),
      User.find({ isActive: true, mustChangePassword: true, role: { $ne: "admin" } }).select("role"),
      Activity.countDocuments({ status: "pending" }),
      OjtUpdate.countDocuments({ status: "submitted" }),
      Notice.find(audience).sort({ createdAt: -1 }).limit(3).populate("postedBy", "name").populate("department", "code").populate("batch", "name"),
      Notice.countDocuments({ ...audience, createdAt: { $gt: req.user.noticesSeenAt || new Date(0) }, postedBy: { $ne: req.user._id } }),
    ]);

  // Only active people count
  const activeStudents = students.filter((s) => s.user?.isActive);
  const activeTeachers = teachers.filter((t) => t.user?.isActive);
  const studentsIn = new Map();
  for (const s of activeStudents) studentsIn.set(String(s.batch), (studentsIn.get(String(s.batch)) || 0) + 1);
  const heldIn = new Map(heldByBatch.map((h) => [String(h._id), h.n]));
  const attendedBy = new Map(marks.map((m) => [String(m._id), m.n]));
  const slotsIn = new Set((await TimetableSlot.distinct("batch")).map(String));

  // Attendance for each department: classes attended / (classes held x students), over all its batches
  const deptRows = departments.map((d) => {
    const own = batches.filter((b) => String(b.department?._id) === String(d._id));
    let possible = 0;
    let attended = 0;
    for (const b of own) possible += (heldIn.get(String(b._id)) || 0) * (studentsIn.get(String(b._id)) || 0);
    for (const s of activeStudents) {
      if (own.some((b) => String(b._id) === String(s.batch))) attended += attendedBy.get(String(s._id)) || 0;
    }
    return {
      _id: d._id,
      name: d.name,
      code: d.code,
      batches: own.length,
      students: own.reduce((n, b) => n + (studentsIn.get(String(b._id)) || 0), 0),
      teachers: activeTeachers.filter((t) => String(t.department) === String(d._id)).length,
      attendance: possible ? Math.round((attended / possible) * 100) : null,
    };
  });

  // Today's classes: which have ended, which are running, and which ended with no attendance taken
  const sessionsFor = (courseId) => todaySessions.filter((s) => String(s.course) === String(courseId));
  const ended = slots.filter((s) => toMin(s.endTime) <= nowMin);
  const endedPerCourse = new Map();
  for (const s of ended) endedPerCourse.set(String(s.course?._id), [...(endedPerCourse.get(String(s.course?._id)) || []), s]);
  const missed = [];
  for (const [courseId, list] of endedPerCourse) {
    // Two classes of one course today but only one session: one of them was missed
    missed.push(...list.slice(sessionsFor(courseId).length));
  }
  const running = slots
    .filter((s) => toMin(s.startTime) <= nowMin && nowMin < toMin(s.endTime))
    .map((s) => {
      const list = sessionsFor(s.course?._id);
      const open = list.find((x) => x.isOpen);
      return {
        _id: s._id,
        code: s.course?.code,
        name: s.course?.name,
        batch: s.batch?.name ?? "",
        teacher: s.teacher?.user?.name ?? "No teacher",
        room: s.room || "",
        start: s.startTime,
        end: s.endTime,
        attendance: open ? "open" : list.length ? "taken" : "not_taken",
      };
    });

  // Things that need the admin, most urgent first
  const attention = [];
  const names = (list, key, max = 4) => {
    const shown = list.slice(0, max).map(key).join(", ");
    return list.length > max ? `${shown} and ${list.length - max} more` : shown;
  };
  if (missed.length) {
    attention.push({
      key: "missed",
      severity: "high",
      title: `${missed.length} ${missed.length === 1 ? "class" : "classes"} ended today without attendance`,
      detail: names(missed, (s) => `${s.course?.code} (${s.batch?.name}, ${s.startTime})`),
    });
  }
  const noTimetable = batches.filter((b) => studentsIn.get(String(b._id)) && !slotsIn.has(String(b._id)));
  if (noTimetable.length) {
    attention.push({
      key: "timetable",
      severity: "high",
      title: `${noTimetable.length} ${noTimetable.length === 1 ? "batch has" : "batches have"} students but no timetable`,
      detail: names(noTimetable, (b) => `${b.department?.code ?? ""} ${b.name}`.trim()),
      link: "/admin/timetable",
      action: "Build timetable",
    });
  }
  if (noTeacher.length) {
    attention.push({
      key: "teacher",
      severity: "mid",
      title: `${noTeacher.length} ${noTeacher.length === 1 ? "course has" : "courses have"} no teacher`,
      detail: names(noTeacher, (c) => `${c.code} (${c.batch?.name ?? "no batch"})`),
      link: "/admin/courses",
      action: "Assign teachers",
    });
  }
  if (pendingActivities) {
    attention.push({
      key: "activities",
      severity: "mid",
      title: `${pendingActivities} impact ${pendingActivities === 1 ? "claim is" : "claims are"} waiting for review`,
      detail: "Students' points stay on hold until someone approves them",
      link: "/admin/activities",
      action: "Review",
    });
  }
  if (pendingOjt) {
    attention.push({
      key: "ojt",
      severity: "mid",
      title: `${pendingOjt} OJT ${pendingOjt === 1 ? "update is" : "updates are"} waiting for review`,
      detail: "Sent by students, not reviewed yet",
      link: "/admin/ojt",
      action: "Review",
    });
  }
  const noManager = batches.filter((b) => studentsIn.get(String(b._id)) && !b.manager);
  if (noManager.length) {
    attention.push({
      key: "manager",
      severity: "low",
      title: `${noManager.length} ${noManager.length === 1 ? "batch has" : "batches have"} no batch manager`,
      detail: names(noManager, (b) => `${b.department?.code ?? ""} ${b.name}`.trim()),
      link: "/admin/users",
      action: "Add a manager",
    });
  }
  if (tempUsers.length) {
    const studentsOnTemp = tempUsers.filter((u) => u.role === "student").length;
    attention.push({
      key: "password",
      severity: "low",
      title: `${tempUsers.length} ${tempUsers.length === 1 ? "person has" : "people have"} not logged in yet`,
      detail: `Still on a temporary password: ${studentsOnTemp} ${studentsOnTemp === 1 ? "student" : "students"}, ${tempUsers.length - studentsOnTemp} staff`,
      link: "/admin/users",
      action: "See users",
    });
  }

  const audienceLabel = (n) =>
    n.audience === "batch" ? n.batch?.name ?? "One batch" : n.audience === "department" ? n.department?.code ?? "One department" : "Everyone";

  res.json({
    me: { name: req.user.name },
    now: time,
    stats: {
      students: activeStudents.length,
      batches: batches.length,
      teachers: activeTeachers.length,
      departments: departments.length,
      classesToday: slots.length,
      runningNow: running.length,
      endedToday: ended.length,
      markedToday: ended.length - missed.length,
    },
    attention,
    departments: deptRows,
    running,
    notices: notices.map((n) => ({ _id: n._id, title: n.title, audience: audienceLabel(n), postedBy: n.postedBy?.name, createdAt: n.createdAt })),
    unreadNotices: unread,
  });
};
