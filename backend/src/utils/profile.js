import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";

// Gets the student or teacher details linked to a user (admins have none).
// An HOD is a teacher too, so they have a teacher profile.
export const getProfile = async (user) => {
  if (user.role === "student") {
    return Student.findOne({ user: user._id }).populate("department", "name code").populate("batch", "name currentSemester");
  }
  if (user.role === "teacher" || user.role === "hod") {
    return Teacher.findOne({ user: user._id }).populate("department", "name code");
  }
  return null;
};
