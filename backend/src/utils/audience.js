import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import AppError from "./AppError.js";

// What this person should see, for anything posted to the college, a department or a batch
// (notices, sessions, internships)
export const visibleTo = async (user) => {
  if (user.role === "admin") return {};
  if (user.role === "student") {
    const s = await Student.findOne({ user: user._id });
    if (!s) throw new AppError("Student profile not found", 404);
    return {
      $or: [
        { audience: "all" },
        { audience: "department", department: s.department },
        { audience: "batch", batch: s.batch },
      ],
    };
  }
  if (user.role === "batch_manager") {
    const batches = await Batch.find({ manager: user._id }).select("_id department");
    return {
      $or: [
        { audience: "all" },
        { audience: "department", department: { $in: batches.map((b) => b.department) } },
        { audience: "batch", batch: { $in: batches.map((b) => b._id) } },
      ],
    };
  }
  // teacher and hod: college wide + their department + its batches
  const t = await Teacher.findOne({ user: user._id });
  if (!t) throw new AppError("Teacher profile not found", 404);
  const batches = await Batch.find({ department: t.department }).select("_id");
  return {
    $or: [
      { audience: "all" },
      { audience: "department", department: t.department },
      { audience: "batch", batch: { $in: batches.map((b) => b._id) } },
    ],
  };
};

// Checks the audience fields and fills in the department for batch notices.
// An HOD can only post to their own department or its batches.
export const checkAudience = async (data, user) => {
  // A batch manager posts only to one of their own batches
  if (user.role === "batch_manager") {
    if (data.audience !== "batch") throw new AppError("Batch managers can post to their own batches only");
    const b = await Batch.findOne({ _id: data.batch, manager: user._id });
    if (!b) throw new AppError("You can only post to batches you manage", 403);
    data.department = b.department;
    return;
  }
  if (data.audience === "all") {
    if (user.role === "hod") throw new AppError("HODs can post to their department or its batches only");
    data.department = undefined;
    data.batch = undefined;
  }
  if (data.audience === "batch") {
    const b = await Batch.findById(data.batch);
    if (!b) throw new AppError("Pick a batch");
    data.department = b.department;
  }
  if (data.audience === "department" && !data.department) throw new AppError("Pick a department");
  if (data.audience === "department") data.batch = undefined;

  if (user.role === "hod") {
    const t = await Teacher.findOne({ user: user._id });
    if (String(t?.department) !== String(data.department)) {
      throw new AppError("You can only post to your own department", 403);
    }
  }
};
