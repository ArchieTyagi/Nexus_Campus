import { Router } from "express";
import { listUsers, listTeachers, getUser, createUser, updateUser, resetUserPassword } from "../controllers/userController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();

router.use(protect);

// HOD can list people in their own department. Everything else is admin only.
router.get("/", allow("admin", "hod"), listUsers);
router.get("/teachers", allow("admin", "hod"), listTeachers);
router.post("/", allow("admin"), createUser);
router.get("/:id", allow("admin"), getUser);
router.patch("/:id", allow("admin"), updateUser);
router.post("/:id/reset-password", allow("admin"), resetUserPassword);

export default router;
