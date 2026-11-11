import { Router } from "express";
import { listMaterials, addMaterial, updateMaterial, deleteMaterial } from "../controllers/materialController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

// Everyone sees material for their own batch or department
router.get("/", listMaterials);

// Admin and HOD add material (batch manager will join later)
router.post("/", allow("admin", "hod", "batch_manager"), addMaterial);
router.patch("/:id", allow("admin", "hod", "batch_manager"), updateMaterial);
router.delete("/:id", allow("admin", "hod", "batch_manager"), deleteMaterial);

export default router;
