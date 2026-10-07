import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";

// Gets the student or teacher details linked to a user (admins have none)
export const getProfile = async (user) => {
  if (user.role === "student") {
    return Student.findOne({ user: user._id }).populate("department", "name code").populate("batch", "name currentSemester");
  }
  if (user.role === "teacher") {
    return Teacher.findOne({ user: user._id }).populate("department", "name code");
  }
  return null;
};
