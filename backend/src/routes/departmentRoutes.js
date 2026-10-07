import { Router } from "express";
import {
  listDepartments, createDepartment, updateDepartment,
  listBatches, createBatch, updateBatch, batchStudents,
} from "../controllers/departmentController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();

// Anyone logged in can see the lists, only admin can change them
router.get("/departments", protect, listDepartments);
router.post("/departments", protect, allow("admin"), createDepartment);
router.patch("/departments/:id", protect, allow("admin"), updateDepartment);

router.get("/batches", protect, listBatches);
router.post("/batches", protect, allow("admin"), createBatch);
router.patch("/batches/:id", protect, allow("admin"), updateBatch);
router.get("/batches/:id/students", protect, allow("admin", "teacher"), batchStudents);

export default router;
