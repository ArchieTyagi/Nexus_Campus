import mongoose from "mongoose";
import Material from "../models/Material.js";
import Batch from "../models/Batch.js";
import AppError from "../utils/AppError.js";
import { viewerScope, pickBatch, departmentBatches } from "../utils/viewer.js";

const withDetails = (query) =>
  query.populate("batch", "name").populate("department", "code").populate("postedBy", "name");

// Who can see what: students their batch, teachers and HODs their department's batches, admin all
// (viewerScope gives a teacher only their own classes, but material is per batch)
const scopeFor = (user) => (user.role === "teacher" ? departmentBatches(user) : viewerScope(user));

// GET /api/materials?batch=<id>&subject=DSA
export const listMaterials = async (req, res) => {
  const scope = await scopeFor(req.user);
  const filter = {};
  if (scope.batch) filter.batch = scope.batch;
  if (req.query.batch && req.user.role !== "student") {
    if (!mongoose.isValidObjectId(req.query.batch)) throw new AppError("Invalid batch");
    filter.batch = pickBatch(scope.batch, req.query.batch);
  }
  if (req.query.subject) filter.subject = req.query.subject;
  res.json(await withDetails(Material.find(filter).sort({ subject: 1, createdAt: -1 }).limit(500)));
};

// Checks the batch exists and an HOD only adds to their own department
const checkBatch = async (batchId, user) => {
  if (!mongoose.isValidObjectId(batchId)) throw new AppError("Pick a batch");
  const b = await Batch.findById(batchId);
  if (!b) throw new AppError("Pick a batch");
  if (user.role === "hod" || user.role === "batch_manager") {
    const scope = await viewerScope(user);
    if (!scope.batch.$in.some((id) => String(id) === String(b._id))) {
      throw new AppError("You can only add material for your own batches", 403);
    }
  }
  return b;
};

const pick = (body) => {
  const keys = ["subject", "title", "link", "note"];
  return Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
};

// POST /api/materials   (admin, hod)  Body: { batch, subject, title, link, note? }
export const addMaterial = async (req, res) => {
  const b = await checkBatch(req.body.batch, req.user);
  const material = await Material.create({
    ...pick(req.body),
    batch: b._id,
    department: b.department,
    postedBy: req.user._id,
  });
  res.status(201).json(await withDetails(Material.findById(material._id)));
};

const findEditable = async (req) => {
  const material = await Material.findById(req.params.id);
  if (!material) throw new AppError("Material not found", 404);
  if (req.user.role !== "admin" && String(material.postedBy) !== String(req.user._id)) {
    throw new AppError("You can only change material you added", 403);
  }
  return material;
};

// PATCH /api/materials/:id   (admin, hod)
export const updateMaterial = async (req, res) => {
  const material = await findEditable(req);
  Object.assign(material, pick(req.body));
  if (req.body.note === "") material.note = undefined;
  await material.save();
  res.json(await withDetails(Material.findById(material._id)));
};

// DELETE /api/materials/:id   (admin, hod)
export const deleteMaterial = async (req, res) => {
  const material = await findEditable(req);
  await material.deleteOne();
  res.json({ message: "Material deleted" });
};
