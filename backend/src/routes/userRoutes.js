import { Router } from "express";
import { listUsers, getUser, createUser, updateUser, resetUserPassword } from "../controllers/userController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();

// Every route here is admin only
router.use(protect, allow("admin"));

router.get("/", listUsers);
router.post("/", createUser);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.post("/:id/reset-password", resetUserPassword);

export default router;
