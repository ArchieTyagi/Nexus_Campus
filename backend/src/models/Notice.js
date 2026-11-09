import mongoose from "mongoose";

// A notice or announcement. Students only read it.
// audience: the whole college, one department, or one batch.
const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    link: {
      type: String,
      trim: true,
      match: [/^https?:\/\/\S+$/i, "Link must start with http:// or https://"],
    },
    audience: { type: String, enum: ["all", "department", "batch"], default: "all" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    important: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

noticeSchema.index({ audience: 1, department: 1, batch: 1, createdAt: -1 });

export default mongoose.model("Notice", noticeSchema);
