import mongoose from "mongoose";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/; // 24 hour "HH:MM", e.g. "09:00", "14:30"

// One class in the weekly timetable.
// batch and teacher are copied from the course so clash checks are fast.
const slotSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    day: { type: String, enum: DAYS, required: true },
    startTime: { type: String, required: true, match: [TIME, "startTime must look like 09:00"] },
    endTime: { type: String, required: true, match: [TIME, "endTime must look like 10:00"] },
    room: { type: String, trim: true },
  },
  { timestamps: true }
);

slotSchema.index({ day: 1, batch: 1 });
slotSchema.index({ day: 1, teacher: 1 });

export default mongoose.model("TimetableSlot", slotSchema);
