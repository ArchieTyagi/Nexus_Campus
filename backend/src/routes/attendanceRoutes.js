import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  myCourses, startSession, sessionQr, sessionDetail, closeSession, markByHand, scan, myAttendance,
} from "../controllers/attendanceController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

// Stops someone from guessing QR codes by trying again and again
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => String(req.user._id),
  message: { message: "Too many scans. Wait a minute and try again." },
  validate: { keyGeneratorIpFallback: false },
});

// Students
router.post("/scan", allow("student"), scanLimiter, scan);
router.get("/mine", allow("student"), myAttendance);

// Teachers run the QR session (HOD and admin can too)
const staff = allow("teacher", "hod", "admin");
router.get("/courses", staff, myCourses);
router.post("/sessions", staff, startSession);
router.get("/sessions/:id", staff, sessionDetail);
router.get("/sessions/:id/qr", staff, sessionQr);
router.post("/sessions/:id/close", staff, closeSession);
router.post("/sessions/:id/mark", staff, markByHand);

export default router;
