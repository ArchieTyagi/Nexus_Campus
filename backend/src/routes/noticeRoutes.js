import { Router } from "express";
import {
  listNotices, unreadCount, markSeen, createNotice, updateNotice, deleteNotice,
} from "../controllers/noticeController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

// Everyone reads the notices meant for them
router.get("/", listNotices);
router.get("/unread", unreadCount);
router.post("/seen", markSeen);

// Admin and HOD post (batch manager will join later)
router.post("/", allow("admin", "hod", "batch_manager"), createNotice);
router.patch("/:id", allow("admin", "hod", "batch_manager"), updateNotice);
router.delete("/:id", allow("admin", "hod", "batch_manager"), deleteNotice);

export default router;
