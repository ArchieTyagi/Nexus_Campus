import Department from "../models/Department.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import AppError from "../utils/AppError.js";
import { viewerScope, departmentBatches } from "../utils/viewer.js";

// GET /api/departments
export const listDepartments = async (req, res) => {
  res.json(await Department.find().sort({ name: 1 }));
};

// POST /api/departments   Body: { name, code }
export const createDepartment = async (req, res) => {
  const { name, code } = req.body;
  res.status(201).json(await Department.create({ name, code }));
};

// PATCH /api/departments/:id
export const updateDepartment = async (req, res) => {
  const { name, code } = req.body;
  const dept = await Department.findByIdAndUpdate(req.params.id, { name, code }, { new: true, runValidators: true });
  if (!dept) throw new AppError("Department not found", 404);
  res.json(dept);
};

// GET /api/batches?department=<id>
export const listBatches = async (req, res) => {
  const filter = req.query.department ? { department: req.query.department } : {};
  res.json(await Batch.find(filter).populate("department", "name code").sort({ startYear: -1, name: 1 }));
};

// POST /api/batches   Body: { name, department, startYear, endYear, currentSemester? }
export const createBatch = async (req, res) => {
  const { name, department, startYear, endYear, currentSemester } = req.body;
  if (!(await Department.exists({ _id: department }))) throw new AppError("Department not found", 404);
  if (Number(endYear) <= Number(startYear)) throw new AppError("End year must be after start year");
  res.status(201).json(await Batch.create({ name, department, startYear, endYear, currentSemester }));
};

// PATCH /api/batches/:id
export const updateBatch = async (req, res) => {
  const { name, startYear, endYear, currentSemester } = req.body;
  const batch = await Batch.findByIdAndUpdate(
    req.params.id,
    { name, startYear, endYear, currentSemester },
    { new: true, runValidators: true }
  );
  if (!batch) throw new AppError("Batch not found", 404);
  res.json(batch);
};

// GET /api/batches/:id/students
// Admin: any batch. HOD and teacher: batches in their department. Batch manager: their own batches.
export const batchStudents = async (req, res) => {
  if (req.user.role !== "admin") {
    const scope = req.user.role === "teacher" ? await departmentBatches(req.user) : await viewerScope(req.user);
    if (!scope.batch.$in.some((id) => String(id) === String(req.params.id))) {
      throw new AppError("You can only see students of your own batches", 403);
    }
  }
  const students = await Student.find({ batch: req.params.id })
    .populate("user", "name email phone isActive")
    .sort({ rollNumber: 1 });
  res.json(students);
};
