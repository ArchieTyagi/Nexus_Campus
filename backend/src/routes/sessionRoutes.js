import { Router } from "express";
import { listSessions, addSession, updateSession, deleteSession } from "../controllers/sessionController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", listSessions);
router.post("/", allow("admin", "hod", "batch_manager"), addSession);
router.patch("/:id", allow("admin", "hod", "batch_manager"), updateSession);
router.delete("/:id", allow("admin", "hod", "batch_manager"), deleteSession);

export default router;
