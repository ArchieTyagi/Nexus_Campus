import { Router } from "express";
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse } from "../controllers/courseController.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

// Everyone can see courses (filtered by role), only admin can change them
router.get("/", listCourses);
router.get("/:id", getCourse);
router.post("/", allow("admin"), createCourse);
router.patch("/:id", allow("admin"), updateCourse);
router.delete("/:id", allow("admin"), deleteCourse);

export default router;
