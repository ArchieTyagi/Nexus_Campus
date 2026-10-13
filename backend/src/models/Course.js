import mongoose from "mongoose";

// A subject taught to one batch by one teacher.
// Example: "Data Structures" (CS201) for batch "2025-2029 Sec A"
const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    credits: { type: Number, min: 0, max: 10, default: 3 },
    semester: { type: Number, min: 1, max: 12, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  },
  { timestamps: true }
);

// The same course code can't be added twice for one batch
courseSchema.index({ code: 1, batch: 1 }, { unique: true });

export default mongoose.model("Course", courseSchema);
