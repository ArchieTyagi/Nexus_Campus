import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
