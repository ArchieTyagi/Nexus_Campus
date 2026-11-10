import mongoose from "mongoose";

const LINK = /^https?:\/\/\S+$/i;

// A student's OJT update for one month (one per student per month)
const ojtUpdateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true }, // copied for fast filtering
    month: { type: String, required: true, match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must look like 2026-11"] },
    project: { type: String, required: [true, "Add your project name"], trim: true, maxlength: 120 },
    workDone: { type: String, required: [true, "Write what you did this month"], trim: true, maxlength: 3000 },
    nextPlan: { type: String, trim: true, maxlength: 1500 },
    blockers: { type: String, trim: true, maxlength: 1000 },
    links: {
      type: [{ type: String, trim: true, match: [LINK, "Links must start with http:// or https://"] }],
      validate: [(list) => list.length <= 5, "Add at most 5 links"],
    },
    status: { type: String, enum: ["submitted", "reviewed", "needs_changes"], default: "submitted" },
    feedback: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

ojtUpdateSchema.index({ student: 1, month: 1 }, { unique: true });
ojtUpdateSchema.index({ batch: 1, month: 1, status: 1 });

export default mongoose.model("OjtUpdate", ojtUpdateSchema);
