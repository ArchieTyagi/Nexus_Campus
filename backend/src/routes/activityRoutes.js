import { Router } from "express";
import {
  myActivities, addActivity, updateActivity, deleteActivity,
  listActivities, reviewActivity, leaderboard,
} from "../controllers/activityController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

// Students add and track their own activities
router.get("/mine", allow("student"), myActivities);
router.post("/", allow("student"), addActivity);
router.patch("/:id", allow("student"), updateActivity);
router.delete("/:id", allow("student"), deleteActivity);

// Leaderboard for a batch
router.get("/leaderboard", allow("student", "admin", "hod"), leaderboard);

// Reviewers approve or reject (batch manager will join later)
router.get("/", allow("admin", "hod"), listActivities);
router.patch("/:id/review", allow("admin", "hod"), reviewActivity);

export default router;
