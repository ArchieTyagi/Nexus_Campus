import { Router } from "express";
import { studentDashboard } from "../controllers/dashboardController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/student", allow("student"), studentDashboard);

export default router;
