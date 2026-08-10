// Fills the database with demo data, so every page has something real to show.
//
//   npm run seed:demo               adds the demo data
//   npm run seed:demo -- --remove   removes the demo data again
//
// The demo data lives in its own two departments (IT and ECE), so it never mixes with real ones.
// Every record this script makes is listed in the "demo_records" collection,
// and --remove deletes only those records (plus anything people added inside the demo batches).
//
// All demo accounts share one password: DEMO_PASSWORD from .env, or a random one printed at the end.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Activity, { pointsFor } from "../models/Activity.js";
import Attendance from "../models/Attendance.js";
import AttendanceSession, { SESSION_MINUTES } from "../models/AttendanceSession.js";
import Batch from "../models/Batch.js";
import Course from "../models/Course.js";
import Department from "../models/Department.js";
import Internship from "../models/Internship.js";
import Material from "../models/Material.js";
import Notice from "../models/Notice.js";
import OjtEvent from "../models/OjtEvent.js";
import OjtUpdate from "../models/OjtUpdate.js";
import Session from "../models/Session.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import TimetableSlot from "../models/TimetableSlot.js";
import User from "../models/User.js";

dotenv.config();
await connectDB();
const records = mongoose.connection.db.collection("demo_records");

// Deletes every demo record (and anything people added inside the demo batches)
const removeDemo = async () => {
  const models = { Activity, Attendance, AttendanceSession, Batch, Course, Department, Internship, Material, Notice, OjtEvent, OjtUpdate, Session, Student, Teacher, TimetableSlot, User };
  const saved = await records.find().toArray();
  const idsOf = (name) => saved.filter((r) => r.model === name).flatMap((r) => r.ids);
  const batches = idsOf("Batch");
  const students = idsOf("Student");
  const courses = idsOf("Course");

  let total = 0;
  total += (await Attendance.deleteMany({ $or: [{ course: { $in: courses } }, { student: { $in: students } }] })).deletedCount;
  total += (await AttendanceSession.deleteMany({ batch: { $in: batches } })).deletedCount;
  for (const Model of [TimetableSlot, Material, OjtEvent, OjtUpdate, Activity]) total += (await Model.deleteMany({ batch: { $in: batches } })).deletedCount;
  await Internship.updateMany({}, { $pull: { applied: { $in: students } } });

  for (const [name, Model] of Object.entries(models)) {
    const ids = idsOf(name);
    if (ids.length) total += (await Model.deleteMany({ _id: { $in: ids } })).deletedCount;
  }
  await records.drop().catch(() => {});
  return total;
};

// ---------- remove ----------
if (process.argv.includes("--remove")) {
  console.log(`Removed ${await removeDemo()} demo records.`);
  await mongoose.disconnect();
  process.exit(0);
}

// ---------- add ----------
if (await records.countDocuments()) {
  console.log("Demo data is already there. To make it fresh, run:  npm run seed:demo -- --remove  and then this again.");
  await mongoose.disconnect();
  process.exit(0);
}

const password = process.env.DEMO_PASSWORD || "Demo-" + crypto.randomBytes(4).toString("hex");
const hash = await bcrypt.hash(password, 10);

// The same "random" numbers every run, so the demo looks the same each time
let seed = 2026;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (list) => list[Math.floor(rand() * list.length)];

// India time helpers
const IST = 330 * 60 * 1000;
const istDate = (date) => new Date(date.getTime() + IST); // read its UTC parts as India time
const at = (day, hhmm) => {
  const d = istDate(day);
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m) - IST);
};
const daysFromNow = (n, hhmm = "10:00") => at(new Date(Date.now() + n * 86400000), hhmm);
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayName = (date) => DAY_NAMES[istDate(date).getUTCDay()];
const monthOf = (date) => istDate(date).toISOString().slice(0, 7);

// Inserts records, keeps their dates as given, and remembers them for --remove
const add = async (Model, docs) => {
  const now = new Date();
  const list = docs.map((d) => ({ _id: new mongoose.Types.ObjectId(), createdAt: d.createdAt || now, updatedAt: d.createdAt || now, ...d }));
  await records.insertOne({ model: Model.modelName, ids: list.map((d) => d._id) });
  return Model.insertMany(list, { timestamps: false });
};

// Stop early if something with the same code, email, employee id or roll number already exists
const DEMO_DEPARTMENTS = ["IT", "EC"];
const clash = [
  ...(await Department.find({ code: { $in: DEMO_DEPARTMENTS } })).map((d) => `department code ${d.code}`),
  ...(await User.find({ email: /@demo\.nexuscampus\.in$/ }).limit(3)).map((u) => `email ${u.email}`),
  ...(await Teacher.find({ employeeId: /^EMP-9\d\d$/ }).limit(3)).map((t) => `employee id ${t.employeeId}`),
  ...(await Student.find({ rollNumber: /^NXC-/ }).limit(3)).map((st) => `roll number ${st.rollNumber}`),
];
if (clash.length) {
  console.log("Not adding demo data, these already exist: " + clash.join(", "));
  await mongoose.disconnect();
  process.exit(1);
}

const admin = await User.findOne({ role: "admin" });

try {
  // Departments and batches
  const [it, ece] = await add(Department, [
    { name: "Information Technology", code: "IT" },
    { name: "Electronics and Communication", code: "EC" },
  ]);
  const batchPlan = [
    { name: "2024-2028 Sec A", department: it._id, startYear: 2024, endYear: 2028, currentSemester: 5 },
    { name: "2025-2029 Sec A", department: it._id, startYear: 2025, endYear: 2029, currentSemester: 3 },
    { name: "2025-2029 Sec A", department: ece._id, startYear: 2025, endYear: 2029, currentSemester: 3 },
  ];
  const batches = await add(Batch, batchPlan);

  // Staff: name, email, role, employee id, department
  const staffPlan = [
    ["Anjali Deshpande", "anjali.deshpande", "hod", "EMP-901", it],
    ["Rahul Joshi", "rahul.joshi", "teacher", "EMP-902", it],
    ["Pooja Kulkarni", "pooja.kulkarni", "teacher", "EMP-903", it],
    ["Vikram Sethi", "vikram.sethi", "teacher", "EMP-904", it],
    ["Farah Siddiqui", "farah.siddiqui", "teacher", "EMP-905", it],
    ["Nikhil Bansal", "nikhil.bansal", "teacher", "EMP-906", it],
    ["Lakshmi Narayanan", "lakshmi.narayanan", "teacher", "EMP-907", it],
    ["Gaurav Mehta", "gaurav.mehta", "teacher", "EMP-908", it],
    ["Suresh Pillai", "suresh.pillai", "hod", "EMP-911", ece],
    ["Kavya Reddy", "kavya.reddy", "teacher", "EMP-912", ece],
    ["Imran Qureshi", "imran.qureshi", "teacher", "EMP-913", ece],
    ["Shalini Ghosh", "shalini.ghosh", "teacher", "EMP-914", ece],
  ];
  const managerPlan = [
    ["Tanvi Agarwal", "tanvi.agarwal", [batches[0], batches[1]]],
    ["Rohan Das", "rohan.das", [batches[2]]],
  ];
  const studentNames = [
    ["Aarav Gupta", "Ishita Jain", "Kunal Malhotra", "Sanya Kapoor", "Yash Chauhan", "Ananya Bhat", "Dev Saxena", "Mira Pandey", "Harsh Vora", "Tara Menon", "Om Prakash", "Zoya Mirza"],
    ["Rishi Thakur", "Nisha Rawat", "Aditya Rao", "Pihu Arora", "Varun Nair", "Simran Kaur", "Kabir Sinha", "Anika Dutta", "Manav Shetty", "Riya Bose", "Siddharth Iyer", "Avni Trivedi"],
    ["Pranav Hegde", "Sneha Kamath", "Arnav Mishra", "Diya Chopra", "Rohit Yadav", "Meghna Pillai", "Ayaan Khan", "Kriti Sharma", "Neel Desai", "Shreya Ghosh", "Vivaan Patil", "Aisha Rehman"],
  ];
  const rollPrefix = ["NXC-24-IT", "NXC-25-IT", "NXC-25-EC"];

  const email = (handle) => `${handle}@demo.nexuscampus.in`;
  const userDoc = (name, handle, role) => ({ name, email: email(handle), password: hash, role, mustChangePassword: false, phone: "98" + String(Math.floor(rand() * 1e8)).padStart(8, "0") });

  const staffUsers = await add(User, staffPlan.map(([n, h, r]) => userDoc(n, h, r)));
  const managerUsers = await add(User, managerPlan.map(([n, h]) => userDoc(n, h, "batch_manager")));
  const studentUsers = await add(User, studentNames.flatMap((names) => names.map((n) => userDoc(n, n.toLowerCase().replace(/[^a-z]+/g, "."), "student"))));

  const teachers = await add(Teacher, staffPlan.map(([, , , emp, dept], i) => ({ user: staffUsers[i]._id, employeeId: emp, department: dept._id })));
  for (const [i, [, , list]] of managerPlan.entries()) await Batch.updateMany({ _id: { $in: list.map((b) => b._id) } }, { manager: managerUsers[i]._id });

  const students = await add(
    Student,
    studentNames.flatMap((names, bi) =>
      names.map((_, si) => ({
        user: studentUsers[bi * 12 + si]._id,
        rollNumber: `${rollPrefix[bi]}-${String(si + 1).padStart(3, "0")}`,
        department: batches[bi].department,
        batch: batches[bi]._id,
      }))
    )
  );
  const studentsOf = (bi) => students.slice(bi * 12, bi * 12 + 12);

  // Courses: per batch, [name, code, credits, teacher index]
  const coursePlan = [
    [["Computer Networks", "IT301", 4, 0], ["Software Engineering", "IT303", 3, 1], ["Machine Learning", "IT305", 4, 2], ["Web Technologies", "IT307", 3, 3]],
    [["Data Structures", "IT201", 4, 4], ["Object Oriented Programming", "IT203", 4, 5], ["Discrete Mathematics", "MA203", 3, 6], ["Digital Logic", "IT205", 3, 7]],
    [["Signals and Systems", "EC201", 4, 8], ["Analog Circuits", "EC203", 4, 9], ["Electromagnetic Fields", "EC205", 3, 10], ["Microcontrollers Lab", "EC207", 2, 11]],
  ];
  const courses = await add(
    Course,
    coursePlan.flatMap((list, bi) =>
      list.map(([name, code, credits, ti]) => ({
        name, code, credits,
        semester: batches[bi].currentSemester,
        department: batches[bi].department,
        batch: batches[bi]._id,
        teacher: teachers[ti]._id,
      }))
    )
  );
  const coursesOf = (bi) => courses.slice(bi * 4, bi * 4 + 4);
  const teacherUserOf = (course) => staffUsers[teachers.findIndex((t) => t._id.equals(course.teacher))]._id;

  // Weekly timetable: the same pattern in every batch, each batch in its own room
  const slotPlan = [
    [0, ["Mon", "Wed", "Fri"], "09:00", "10:00"],
    [1, ["Mon", "Wed", "Fri"], "10:15", "11:15"],
    [2, ["Tue", "Thu", "Sat"], "09:00", "10:00"],
    [3, ["Tue", "Thu"], "11:30", "12:30"],
    [3, ["Wed"], "14:00", "16:00"],
    [2, ["Tue"], "14:00", "15:00"],
  ];
  const rooms = ["Room 301", "Room 204", "Room 112"];
  const labs = ["Lab 2", "Lab 1", "EC Lab"];
  const slots = [];
  for (const bi of [0, 1, 2]) {
    const list = coursesOf(bi);
    for (const [ci, days, startTime, endTime] of slotPlan) {
      for (const day of days) {
        slots.push({ course: list[ci]._id, batch: batches[bi]._id, teacher: list[ci].teacher, day, startTime, endTime, room: startTime === "14:00" && day === "Wed" ? labs[bi] : rooms[bi] });
      }
    }
  }
  await add(TimetableSlot, slots);

  // Attendance for the last four weeks of classes.
  // Each student has their own habit, so some end up below 75%. A few classes were never marked.
  const habits = [0.96, 0.92, 0.9, 0.88, 0.86, 0.84, 0.8, 0.78, 0.74, 0.68, 0.6, 0.94];
  const sessionDocs = [];
  const marks = [];
  for (let back = 28; back >= 0; back--) {
    const day = new Date(Date.now() - back * 86400000);
    const name = dayName(day);
    for (const slot of slots.filter((s) => s.day === name)) {
      if (back === 0 && at(day, slot.endTime) > new Date()) continue; // today: only classes that have ended
      if (rand() < 0.04) continue; // a class nobody marked
      const course = courses.find((c) => c._id.equals(slot.course));
      const startedAt = at(day, slot.startTime);
      const endsAt = new Date(startedAt.getTime() + SESSION_MINUTES * 60000);
      const _id = new mongoose.Types.ObjectId();
      sessionDocs.push({ _id, course: course._id, batch: slot.batch, teacher: course.teacher, startedBy: teacherUserOf(course), startedAt, endsAt, closedAt: endsAt, secret: crypto.randomBytes(16).toString("hex"), createdAt: startedAt });
      const bi = batches.findIndex((b) => b._id.equals(slot.batch));
      studentsOf(bi).forEach((st, si) => {
        if (rand() < habits[si]) {
          marks.push({ session: _id, course: course._id, student: st._id, markedBy: rand() < 0.9 ? "qr" : "teacher", createdAt: new Date(startedAt.getTime() + Math.floor(rand() * 8 * 60000)) });
        }
      });
    }
  }
  await add(AttendanceSession, sessionDocs);
  await add(Attendance, marks);

  // Notices
  const hodIT = staffUsers[0], hodECE = staffUsers[8];
  const notices = [
    { title: "Mid-semester exams from 30 November", body: "Mid-semester exams run from 30 November to 5 December. Carry your college ID card to every exam. Seating plans go up on the notice board two days before.", audience: "all", important: true, pinned: true, postedBy: (admin || hodIT)._id, createdAt: daysFromNow(-2, "11:00") },
    { title: "Library open till 9 PM during exams", body: "From 23 November the library stays open till 9 PM on weekdays and till 5 PM on Saturdays.", audience: "all", postedBy: (admin || hodIT)._id, createdAt: daysFromNow(-5, "16:30") },
    { title: "IT department meeting with class representatives", body: "Class representatives of all IT batches, please come to the HOD cabin on Thursday at 1 PM.", audience: "department", department: it._id, postedBy: hodIT._id, createdAt: daysFromNow(-1, "09:40") },
    { title: "Lab records to be signed this week", body: "Bring your Microcontrollers lab record to the EC Lab before Friday for signing.", audience: "department", department: ece._id, postedBy: hodECE._id, createdAt: daysFromNow(-3, "12:15") },
    { title: "OJT update for November due on the 28th", body: "Submit your November OJT update in the portal before 28 November, 6 PM. Add your GitHub or demo link.", audience: "batch", batch: batches[0]._id, category: "ojt", important: true, postedBy: managerUsers[0]._id, createdAt: daysFromNow(-4, "10:00") },
    { title: "Extra class for Data Structures on Saturday", body: "There is an extra Data Structures class this Saturday from 11:30 to 12:30 in Room 204 to finish trees.", audience: "batch", batch: batches[1]._id, postedBy: managerUsers[0]._id, createdAt: daysFromNow(-1, "17:20") },
    { title: "Industrial visit to BEL on 4 December", body: "Names for the industrial visit to BEL close on 25 November. Fill the form shared by your batch manager.", audience: "batch", batch: batches[2]._id, link: "https://forms.gle/demo", postedBy: managerUsers[1]._id, createdAt: daysFromNow(-6, "15:00") },
  ];
  await add(Notice, notices);

  // Study material
  const materials = [];
  const materialPlan = [
    [0, [["IT301", "Unit 3: transport layer notes"], ["IT301", "TCP vs UDP practice questions"], ["IT305", "Linear regression lecture slides"], ["IT305", "Assignment 2: classification"], ["IT307", "React basics handout"]]],
    [1, [["IT201", "Linked lists and stacks notes"], ["IT201", "Trees: practice set 1"], ["IT203", "Inheritance and polymorphism slides"], ["MA203", "Graph theory problem sheet"], ["IT205", "K-map worked examples"]]],
    [2, [["EC201", "Fourier series notes"], ["EC203", "BJT biasing slides"], ["EC205", "Maxwell's equations summary"], ["EC207", "Lab 4: timers and interrupts"]]],
  ];
  for (const [bi, list] of materialPlan) {
    list.forEach(([subject, title], i) => {
      const course = coursesOf(bi).find((c) => c.code === subject);
      materials.push({ batch: batches[bi]._id, department: batches[bi].department, subject, title, link: "https://drive.google.com/drive/folders/demo", note: i % 2 ? "" : "Read before the next class", postedBy: teacherUserOf(course), createdAt: daysFromNow(-(i * 3 + 1), "18:00") });
    });
  }
  await add(Material, materials);

  // Talks and workshops
  await add(Session, [
    { title: "Getting started with open source", kind: "open_source", speaker: "Neha Kulkarni, open source maintainer", startsAt: daysFromNow(2, "16:00"), minutes: 60, place: "Seminar hall", audience: "all", postedBy: (admin || hodIT)._id },
    { title: "Resume and LinkedIn review", kind: "placement", speaker: "Placement cell", startsAt: daysFromNow(4, "15:00"), minutes: 90, link: "https://meet.google.com/demo-link", audience: "batch", batch: batches[0]._id, postedBy: managerUsers[0]._id },
    { title: "Hands-on PCB design workshop", kind: "workshop", speaker: "Kavya Reddy", startsAt: daysFromNow(6, "14:00"), minutes: 120, place: "EC Lab", audience: "department", department: ece._id, postedBy: hodECE._id },
    { title: "How recruiters read your GitHub", kind: "talk", speaker: "Arjun Rao, engineering manager", startsAt: daysFromNow(-3, "16:00"), minutes: 60, place: "Seminar hall", audience: "all", postedBy: (admin || hodIT)._id },
  ]);

  // Internships
  const applied = (bi, count) => studentsOf(bi).slice(0, count).map((s) => s._id);
  await add(Internship, [
    { role: "Frontend Developer Intern", company: "Zoho", mode: "onsite", location: "Chennai", stipend: "₹25,000 a month", duration: "6 months", eligibility: "3rd year and above, knows React", details: "Work on the web app team building new screens.", applyLink: "https://careers.zoho.com", deadline: daysFromNow(5, "23:59"), audience: "all", applied: applied(0, 5), postedBy: (admin || hodIT)._id },
    { role: "Data Analyst Intern", company: "Swiggy", mode: "hybrid", location: "Bengaluru", stipend: "₹30,000 a month", duration: "3 months", eligibility: "Python and SQL", applyLink: "https://careers.swiggy.com", deadline: daysFromNow(10, "23:59"), audience: "all", applied: [...applied(0, 3), ...applied(1, 2)], postedBy: (admin || hodIT)._id },
    { role: "Embedded Systems Intern", company: "Bosch", mode: "onsite", location: "Bengaluru", stipend: "₹20,000 a month", duration: "6 months", eligibility: "ECE students, knows C", applyLink: "https://www.bosch.in/careers", deadline: daysFromNow(8, "23:59"), audience: "department", department: ece._id, applied: applied(2, 4), postedBy: hodECE._id },
    { role: "Backend Intern", company: "Razorpay", mode: "remote", stipend: "₹40,000 a month", duration: "6 months", applyLink: "https://razorpay.com/jobs", deadline: daysFromNow(-2, "23:59"), audience: "department", department: it._id, applied: applied(0, 6), postedBy: hodIT._id },
  ]);

  // OJT calendar
  await add(OjtEvent, [
    { batch: batches[0]._id, department: it._id, type: "meeting", title: "OJT check-in with mentors", startsAt: daysFromNow(1, "15:00"), link: "https://meet.google.com/demo-link", postedBy: managerUsers[0]._id },
    { batch: batches[0]._id, department: it._id, type: "deadline", title: "November OJT update due", startsAt: daysFromNow(11, "18:00"), postedBy: managerUsers[0]._id },
    { batch: batches[0]._id, department: it._id, type: "viva", title: "OJT viva round 1", startsAt: daysFromNow(15, "10:00"), place: "Room 301", postedBy: managerUsers[0]._id },
    { batch: batches[1]._id, department: it._id, type: "meeting", title: "Project idea discussion", startsAt: daysFromNow(3, "14:00"), place: "Room 204", postedBy: managerUsers[0]._id },
    { batch: batches[2]._id, department: ece._id, type: "viva", title: "Mini project viva", startsAt: daysFromNow(7, "10:30"), place: "EC Lab", postedBy: managerUsers[1]._id },
  ]);

  // OJT updates: last month for everyone in the senior batch, this month for some
  const thisMonth = monthOf(new Date());
  const lastMonth = monthOf(new Date(Date.now() - 31 * 86400000));
  const projects = ["Campus event app", "Smart attendance system", "Library seat finder", "Expense tracker", "Hostel complaint portal", "Bus tracking app"];
  const updates = [];
  studentsOf(0).forEach((st, si) => {
    const project = projects[si % projects.length];
    updates.push({ student: st._id, batch: batches[0]._id, month: lastMonth, project, workDone: "Finished the login and home screens, and set up the database.", nextPlan: "Build the main feature and connect it to the backend.", links: ["https://github.com/demo/project"], status: "reviewed", feedback: "Good progress. Add screenshots next time.", reviewedBy: managerUsers[0]._id, reviewedAt: daysFromNow(-12), createdAt: daysFromNow(-20) });
    if (si < 8) {
      updates.push({ student: st._id, batch: batches[0]._id, month: thisMonth, project, workDone: "Built the main feature and wrote tests for the API.", nextPlan: "Deploy it and get feedback from five users.", blockers: si === 2 ? "Waiting for the college API key." : "", links: ["https://github.com/demo/project"], status: si < 3 ? "reviewed" : si === 3 ? "needs_changes" : "submitted", feedback: si < 3 ? "Nice work." : si === 3 ? "Add a demo link." : "", ...(si < 4 ? { reviewedBy: managerUsers[0]._id, reviewedAt: daysFromNow(-1) } : {}), createdAt: daysFromNow(-(si % 5) - 2) });
    }
  });
  await add(OjtUpdate, updates);

  // Activities for the impact score
  const activityPlan = [
    ["Smart India Hackathon, internal round", "hackathon", "selected"],
    ["Summer internship at a local startup", "internship", "selected"],
    ["Hacktoberfest pull requests", "open_source", "registered"],
    ["Built a college club website", "project", "registered"],
    ["Google Developer Student Club core team", "program", "selected"],
    ["Freelance website for a cafe", "side_hustle", "registered"],
  ];
  const activities = [];
  for (const bi of [0, 1, 2]) {
    studentsOf(bi).forEach((st, si) => {
      const count = si % 4 === 0 ? 2 : si % 3 === 0 ? 1 : 0;
      for (let k = 0; k < count; k++) {
        const [title, category, stage] = pick(activityPlan);
        const status = k === 0 ? "approved" : pick(["pending", "approved", "rejected"]);
        activities.push({ student: st._id, batch: batches[bi]._id, title, category, stage, proofUrl: "https://example.com/proof", date: daysFromNow(-Math.floor(rand() * 60) - 5), status, approvedPoints: status === "approved" ? pointsFor(stage) : 0, ...(status !== "pending" ? { reviewedBy: managerUsers[bi === 2 ? 1 : 0]._id, reviewedAt: daysFromNow(-2) } : {}), reviewNote: status === "rejected" ? "The proof link does not open." : undefined, createdAt: daysFromNow(-Math.floor(rand() * 10) - 3) });
      }
    });
  }
  await add(Activity, activities);

  console.log(`Demo data added: 2 departments, 3 batches, ${staffUsers.length} staff, 2 batch managers, ${students.length} students, ${courses.length} courses,`);
  console.log(`${slots.length} timetable classes, ${sessionDocs.length} past classes with attendance, ${notices.length} notices and more.`);
  console.log("");
  console.log("Demo logins (all use the same password):");
  console.log("  HOD (IT)           " + email("anjali.deshpande"));
  console.log("  Teacher            " + email("pooja.kulkarni"));
  console.log("  Batch manager      " + email("tanvi.agarwal"));
  console.log("  Student            " + rollPrefix[0] + "-001  or  " + studentUsers[0].email);
  console.log("  Password           " + password);
} catch (err) {
  console.log("Something went wrong, so the demo data added so far was removed again.");
  await removeDemo();
  await mongoose.disconnect();
  throw err;
}

await mongoose.disconnect();
