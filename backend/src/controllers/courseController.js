import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Teacher from "../models/Teacher.js";
import TimetableSlot from "../models/TimetableSlot.js";
import AppError from "../utils/AppError.js";
import { viewerScope } from "../utils/viewer.js";

const withDetails = (query) =>
  query
    .populate("department", "name code")
    .populate("batch", "name currentSemester")
    .populate({ path: "teacher", select: "employeeId user", populate: { path: "user", select: "name email" } });

// Checks that the batch and teacher exist and belong together
const checkLinks = async ({ department, batch, teacher }) => {
  const b = await Batch.findById(batch);
  if (!b) throw new AppError("Batch not found", 404);
  if (department && String(b.department) !== String(department)) {
    throw new AppError("This batch is not in that department");
  }
  if (teacher && !(await Teacher.exists({ _id: teacher }))) throw new AppError("Teacher not found", 404);
  return b;
};

// GET /api/courses?batch=<id>&teacher=<id>&semester=3
// Students only see their batch's courses, teachers only their own.
export const listCourses = async (req, res) => {
  const filter = await viewerScope(req.user);
  if (req.user.role === "admin") {
    if (req.query.batch) filter.batch = req.query.batch;
    if (req.query.teacher) filter.teacher = req.query.teacher;
    if (req.query.department) filter.department = req.query.department;
  }
  if (req.query.semester) filter.semester = Number(req.query.semester);
  res.json(await withDetails(Course.find(filter).sort({ semester: 1, code: 1 })));
};

// GET /api/courses/:id
export const getCourse = async (req, res) => {
  const course = await withDetails(Course.findById(req.params.id));
  if (!course) throw new AppError("Course not found", 404);
  res.json(course);
};

// POST /api/courses
// Body: { name, code, credits, semester, batch, teacher? }  (department is taken from the batch)
export const createCourse = async (req, res) => {
  const { name, code, credits, semester, batch, teacher } = req.body;
  const b = await checkLinks({ department: req.body.department, batch, teacher });
  const course = await Course.create({ name, code, credits, semester, batch, teacher, department: b.department });
  res.status(201).json(await withDetails(Course.findById(course._id)));
};

// PATCH /api/courses/:id   (change name, credits, semester or assign a teacher)
export const updateCourse = async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError("Course not found", 404);

  const { name, code, credits, semester, teacher } = req.body;
  if (teacher !== undefined && teacher !== null && !(await Teacher.exists({ _id: teacher }))) {
    throw new AppError("Teacher not found", 404);
  }
  if (name !== undefined) course.name = name;
  if (code !== undefined) course.code = code;
  if (credits !== undefined) course.credits = credits;
  if (semester !== undefined) course.semester = semester;

  const teacherChanged = teacher !== undefined && String(teacher) !== String(course.teacher);
  if (teacher !== undefined) course.teacher = teacher || undefined;

  // If the teacher changes, their timetable slots must not clash with the new teacher's classes
  if (teacherChanged && course.teacher) {
    const slots = await TimetableSlot.find({ course: course._id });
    for (const s of slots) {
      const clash = await TimetableSlot.findOne({
        _id: { $ne: s._id },
        teacher: course.teacher,
        day: s.day,
        startTime: { $lt: s.endTime },
        endTime: { $gt: s.startTime },
      });
      if (clash) throw new AppError(`New teacher already has a class on ${s.day} ${clash.startTime}-${clash.endTime}`, 409);
    }
  }

  await course.save();
  if (teacherChanged) await TimetableSlot.updateMany({ course: course._id }, { teacher: course.teacher });
  res.json(await withDetails(Course.findById(course._id)));
};

// DELETE /api/courses/:id   (also removes its timetable slots)
export const deleteCourse = async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) throw new AppError("Course not found", 404);
  await TimetableSlot.deleteMany({ course: course._id });
  res.json({ message: "Course deleted" });
};
