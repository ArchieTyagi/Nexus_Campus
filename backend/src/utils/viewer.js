import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Batch from "../models/Batch.js";
import AppError from "./AppError.js";

// Works out what the logged-in person is allowed to see.
// Students: only their own batch. Teachers: only their own classes.
// HOD: every batch in their department. Batch manager: the batches they manage. Admin: anything.
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
  if (user.role === "hod") {
    const department = await hodDepartment(user);
    const batches = await Batch.find({ department }).select("_id");
    return { batch: { $in: batches.map((b) => b._id) } };
  }
  if (user.role === "batch_manager") {
    return { batch: { $in: await managedBatchIds(user) } };
  }
  return {};
};

// The batches a batch manager looks after
export const managedBatchIds = async (user) => (await Batch.find({ manager: user._id }).select("_id")).map((b) => b._id);

// The department an HOD looks after
export const hodDepartment = async (user) => {
  const t = await Teacher.findOne({ user: user._id });
  if (!t) throw new AppError("HOD profile not found", 404);
  return t.department;
};

// Every batch in a teacher's or HOD's department, as a filter
export const departmentBatches = async (user) => {
  const t = await Teacher.findOne({ user: user._id });
  if (!t) throw new AppError("Teacher profile not found", 404);
  const batches = await Batch.find({ department: t.department }).select("_id");
  return { batch: { $in: batches.map((b) => b._id) } };
};

// Lets admin or HOD pick one batch with ?batch=<id>.
// For an HOD, a batch outside their department gives no results.
export const pickBatch = (scopeBatch, wanted) => {
  if (!scopeBatch) return wanted;
  const allowed = scopeBatch.$in.some((id) => String(id) === String(wanted));
  return allowed ? wanted : { $in: [] };
};
