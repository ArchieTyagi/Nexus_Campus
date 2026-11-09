import mongoose from "mongoose";

// A student marked present in one session. No record = absent.
const attendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    markedBy: { type: String, enum: ["qr", "teacher"], required: true },
  },
  { timestamps: true }
);

// A student can be marked only once per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceSchema.index({ student: 1, course: 1 });

export default mongoose.model("Attendance", attendanceSchema);
