import { Router } from "express";
import {
  listInternships, addInternship, updateInternship, deleteInternship, markApplied, applicants,
} from "../controllers/internshipController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", listInternships);
router.post("/:id/applied", allow("student"), markApplied);

router.post("/", allow("admin", "hod", "batch_manager"), addInternship);
router.patch("/:id", allow("admin", "hod", "batch_manager"), updateInternship);
router.delete("/:id", allow("admin", "hod", "batch_manager"), deleteInternship);
router.get("/:id/applicants", allow("admin", "hod", "batch_manager"), applicants);

export default router;
