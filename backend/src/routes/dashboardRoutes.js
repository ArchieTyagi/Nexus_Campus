import { Router } from "express";
import { studentDashboard, batchDashboard } from "../controllers/dashboardController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/student", allow("student"), studentDashboard);
router.get("/batch", allow("batch_manager", "hod", "admin"), batchDashboard);

export default router;
