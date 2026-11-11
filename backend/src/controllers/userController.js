import crypto from "crypto";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Batch from "../models/Batch.js";
import Department from "../models/Department.js";
import AppError from "../utils/AppError.js";
import { getProfile } from "../utils/profile.js";
import { hodDepartment, managedBatchIds } from "../utils/viewer.js";

const makeTempPassword = () => crypto.randomBytes(6).toString("base64url"); // 8 characters

// Teachers and HODs both have a teacher profile
const isStaff = (role) => role === "teacher" || role === "hod";

// Gives a batch manager these batches (and takes away any others they had).
// A batch has one manager, so a batch that had someone else moves to this person.
const setManagedBatches = async (userId, batchIds) => {
  if (!Array.isArray(batchIds) || batchIds.length === 0) throw new AppError("Pick at least one batch to manage");
  const found = await Batch.countDocuments({ _id: { $in: batchIds } });
  if (found !== new Set(batchIds.map(String)).size) throw new AppError("One of those batches was not found", 404);
  await Batch.updateMany({ manager: userId, _id: { $nin: batchIds } }, { $unset: { manager: 1 } });
  await Batch.updateMany({ _id: { $in: batchIds } }, { manager: userId });
};

// A department can have only one active HOD
const checkOneHod = async (department, ignoreUserId) => {
  const hods = await User.find({ role: "hod", isActive: true, _id: { $ne: ignoreUserId } }).select("_id");
  const taken = await Teacher.exists({ department, user: { $in: hods.map((h) => h._id) } });
  if (taken) throw new AppError("This department already has an HOD", 409);
};

// Adds each person's roll number / employee ID, department and batch, for lists
const withProfiles = async (users) => {
  const ids = users.map((u) => u._id);
  const [students, teachers] = await Promise.all([
    Student.find({ user: { $in: ids } }).populate("department", "name code").populate("batch", "name"),
    Teacher.find({ user: { $in: ids } }).populate("department", "name code"),
  ]);
  const byUser = new Map([...students, ...teachers].map((p) => [String(p.user), p]));
  // Batch managers: the batches they look after
  const managed = await Batch.find({ manager: { $in: ids } }).populate("department", "code").select("name department manager");
  for (const b of managed) {
    const key = String(b.manager);
    if (!byUser.has(key)) byUser.set(key, { batches: [] });
    byUser.get(key).batches.push(b);
  }
  return users.map((u) => ({ ...u.toJSON(), profile: byUser.get(String(u._id)) ?? null }));
};

// GET /api/users/teachers?department=<id>   (admin, hod)
// Teacher profiles (HODs included) for dropdowns, like picking who teaches a course
export const listTeachers = async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.user.role === "hod") filter.department = await hodDepartment(req.user);
  const teachers = await Teacher.find(filter)
    .populate({ path: "user", select: "name email role isActive" })
    .populate("department", "name code");
  res.json(
    teachers
      .filter((t) => t.user?.isActive)
      .sort((a, b) => a.user.name.localeCompare(b.user.name))
  );
};

// GET /api/users?role=student&department=<id>&batch=<id>&search=piyush&page=1
export const listUsers = async (req, res) => {
  const { role, batch, search, active } = req.query;
  let { department } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const filter = {};
  if (role) filter.role = role;

  // An HOD only sees teachers and students of their own department
  if (req.user.role === "hod") {
    department = await hodDepartment(req.user);
    if (role === "admin") return res.json({ users: [], total: 0, page, pages: 0 });
  }
  if (active === "true" || active === "false") filter.isActive = active === "true";

  // A batch manager only sees students of the batches they manage
  if (req.user.role === "batch_manager") {
    if (role && role !== "student") return res.json({ users: [], total: 0, page, pages: 0 });
    const mine = await managedBatchIds(req.user);
    const batches = batch ? mine.filter((id) => String(id) === String(batch)) : mine;
    const students = await Student.find({ batch: { $in: batches } }).select("user");
    filter._id = { $in: students.map((p) => p.user) };
    department = undefined;
  } else if (department || batch) {
    // Filter by department / batch through the student and teacher profiles
    const where = {};
    if (department) where.department = department;
    if (batch) where.batch = batch;
    const students = await Student.find(where).select("user");
    const teachers = batch ? [] : await Teacher.find(department ? { department } : {}).select("user");
    filter._id = { $in: [...students, ...teachers].map((p) => p.user) };
  }

  if (search) {
    const text = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingStudents = await Student.find({ rollNumber: new RegExp(text, "i") }).select("user");
    filter.$or = [
      { name: new RegExp(text, "i") },
      { email: new RegExp(text, "i") },
      { _id: { $in: matchingStudents.map((s) => s.user) } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ users: await withProfiles(users), total, page, pages: Math.ceil(total / limit) });
};

// GET /api/users/:id
export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  res.json({ user, profile: await getProfile(user) });
};

// POST /api/users
// Student: { name, email, role: "student", rollNumber, department, batch, phone?, password? }
// Teacher: { name, email, role: "teacher", employeeId, department, phone?, password? }
// HOD:     same as teacher, with role: "hod" (one per department)
// Batch manager: { name, email, role: "batch_manager", batches: [<batch id>, ...], phone?, password? }
// Admin:   { name, email, role: "admin", phone?, password? }
export const createUser = async (req, res) => {
  const { name, email, role, phone, rollNumber, employeeId, department, batch } = req.body;
  if (!["admin", "hod", "batch_manager", "teacher", "student"].includes(role)) {
    throw new AppError("Role must be admin, hod, batch_manager, teacher or student");
  }
  if (role === "batch_manager" && (!Array.isArray(req.body.batches) || req.body.batches.length === 0)) {
    throw new AppError("Pick at least one batch to manage");
  }

  // Check the profile details before creating anything
  if (role === "student") {
    if (!rollNumber || !department || !batch) throw new AppError("Students need rollNumber, department and batch");
    const b = await Batch.findById(batch);
    if (!b) throw new AppError("Batch not found", 404);
    if (String(b.department) !== String(department)) throw new AppError("This batch is not in that department");
  }
  if (isStaff(role)) {
    if (!employeeId || !department) throw new AppError("Teachers and HODs need employeeId and department");
    if (!(await Department.exists({ _id: department }))) throw new AppError("Department not found", 404);
    if (role === "hod") await checkOneHod(department);
  }

  const password = req.body.password || makeTempPassword();
  const user = await User.create({ name, email, role, phone, password });

  // If the profile fails (for example, duplicate roll number), remove the user too
  try {
    if (role === "student") await Student.create({ user: user._id, rollNumber, department, batch });
    if (isStaff(role)) await Teacher.create({ user: user._id, employeeId, department });
    if (role === "batch_manager") await setManagedBatches(user._id, req.body.batches);
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    throw err;
  }

  res.status(201).json({
    user,
    profile: await getProfile(user),
    // Shown once so the admin can share it. The user must change it on first login.
    tempPassword: req.body.password ? undefined : password,
  });
};

// PATCH /api/users/:id
// Admin can change: name, phone, isActive, and profile fields (rollNumber, employeeId, department, batch)
// role can switch between "teacher" and "hod" (to make a teacher the HOD, or undo it)
// For a batch manager, batches: [<batch id>, ...] replaces the batches they manage
export const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);

  const { name, phone, email, isActive, rollNumber, employeeId, department, batch, role } = req.body;

  if (role !== undefined && role !== user.role) {
    if (!isStaff(user.role) || !isStaff(role)) throw new AppError("Role can only switch between teacher and hod");
    user.role = role;
  }

  // Check the one-HOD rule before saving anything
  if (user.role === "hod") {
    const teacher = await Teacher.findOne({ user: user._id });
    const willBeActive = isActive !== undefined ? isActive : user.isActive;
    if (willBeActive) await checkOneHod(department ?? teacher.department, user._id);
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (email !== undefined) user.email = email;
  if (isActive !== undefined) {
    if (String(user._id) === String(req.user._id) && isActive === false) {
      throw new AppError("You cannot deactivate your own account");
    }
    user.isActive = isActive;
  }
  await user.save();

  if (user.role === "student") {
    const student = await Student.findOne({ user: user._id });
    if (rollNumber !== undefined) student.rollNumber = rollNumber;
    if (department !== undefined) student.department = department;
    if (batch !== undefined) student.batch = batch;
    await student.save();
  }
  if (isStaff(user.role)) {
    const teacher = await Teacher.findOne({ user: user._id });
    if (employeeId !== undefined) teacher.employeeId = employeeId;
    if (department !== undefined) teacher.department = department;
    await teacher.save();
  }

  if (user.role === "batch_manager" && req.body.batches !== undefined) {
    await setManagedBatches(user._id, req.body.batches);
  }

  res.json({ user, profile: await getProfile(user) });
};

// POST /api/users/:id/reset-password
// Admin sets a new temporary password for someone who forgot theirs
export const resetUserPassword = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);

  const password = makeTempPassword();
  user.password = password;
  user.mustChangePassword = true;
  await user.save();
  res.json({ message: "Password reset", tempPassword: password });
};
