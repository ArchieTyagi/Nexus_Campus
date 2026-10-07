import mongoose from "mongoose";

// Example: "2025-2029 Sec A" in the CSE department
const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },
    currentSemester: { type: Number, min: 1, max: 12, default: 1 },
  },
  { timestamps: true }
);

batchSchema.index({ name: 1, department: 1 }, { unique: true });

export default mongoose.model("Batch", batchSchema);
