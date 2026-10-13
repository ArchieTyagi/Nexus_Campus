import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import AppError from "./AppError.js";

// Works out what the logged-in person is allowed to see.
// Students: only their own batch. Teachers: only their own classes. Admin: anything.
export const viewerScope = async (user) => {
  if (user.role === "student") {
    const s = await Student.findOne({ user: user._id });
    if (!s) throw new AppError("Student profile not found", 404);
    return { batch: s.batch };
  }
  if (user.role === "teacher") {
    const t = await Teacher.findOne({ user: user._id });
    if (!t) throw new AppError("Teacher profile not found", 404);
    return { teacher: t._id };
  }
  return {};
};
