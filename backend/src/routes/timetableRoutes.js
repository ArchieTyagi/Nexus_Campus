import { Router } from "express";
import { getTimetable, getToday, createSlot, updateSlot, deleteSlot } from "../controllers/timetableController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", getTimetable);
router.get("/today", getToday);
router.post("/", allow("admin"), createSlot);
router.patch("/:id", allow("admin"), updateSlot);
router.delete("/:id", allow("admin"), deleteSlot);

export default router;
