import { Router } from "express";
import {
  listInternships, addInternship, updateInternship, deleteInternship, markApplied, applicants,
} from "../controllers/internshipController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", listInternships);
router.post("/:id/applied", allow("student"), markApplied);

router.post("/", allow("admin", "hod"), addInternship);
router.patch("/:id", allow("admin", "hod"), updateInternship);
router.delete("/:id", allow("admin", "hod"), deleteInternship);
router.get("/:id/applicants", allow("admin", "hod"), applicants);

export default router;
