import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, me, changePassword } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Max 5 wrong tries per 15 minutes, per IP + login name
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}-${String(req.body?.login || "").toLowerCase()}`,
  message: { message: "Too many wrong tries. Try again in 15 minutes." },
  validate: { keyGeneratorIpFallback: false },
});

router.post("/login", loginLimiter, login);
router.get("/me", protect, me);
router.post("/change-password", protect, changePassword);

export default router;
