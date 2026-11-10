import { Router } from "express";
import {
  myUpdates, saveMyUpdate, listUpdates, reviewUpdate,
  listEvents, addEvent, updateEvent, deleteEvent,
} from "../controllers/ojtController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

// Monthly updates
router.get("/updates/mine", allow("student"), myUpdates);
router.put("/updates/mine", allow("student"), saveMyUpdate);
router.get("/updates", allow("admin", "hod"), listUpdates);
router.patch("/updates/:id/review", allow("admin", "hod"), reviewUpdate);

// Viva, meetings and deadlines
router.get("/events", listEvents);
router.post("/events", allow("admin", "hod"), addEvent);
router.patch("/events/:id", allow("admin", "hod"), updateEvent);
router.delete("/events/:id", allow("admin", "hod"), deleteEvent);

export default router;
