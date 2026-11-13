import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import ojtRoutes from "./routes/ojtRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import internshipRoutes from "./routes/internshipRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Online, the hosting site passes every request through its own servers first.
// TRUST_PROXY = how many of those servers to skip to find the visitor's real IP address,
// so the login and scan limits count each person separately. Leave it out when running locally.
const proxyHops = Number(process.env.TRUST_PROXY || 0);
if (proxyHops > 0) app.set("trust proxy", proxyHops);

// CLIENT_URL can list more than one site, separated by commas (for example the live site and localhost)
const allowedSites = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);
app.use(cors({ origin: allowedSites }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  // ip = the address the server sees for you. If it ever stops matching your real IP, TRUST_PROXY needs checking.
  res.json({ status: "ok", message: "Nexus Campus backend is running", ip: req.ip });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/ojt", ojtRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", departmentRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
