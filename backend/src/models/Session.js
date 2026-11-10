import mongoose from "mongoose";

// A talk, workshop or open source session that students can join
const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Add a title"], trim: true, maxlength: 150 },
    kind: { type: String, enum: ["open_source", "workshop", "talk", "placement", "other"], default: "talk" },
    speaker: { type: String, trim: true, maxlength: 120 },
    startsAt: { type: Date, required: [true, "Add the date and time"] },
    minutes: { type: Number, min: 10, max: 600, default: 60 },
    place: { type: String, trim: true, maxlength: 120 },
    link: { type: String, trim: true, match: [/^https?:\/\/\S+$/i, "Link must start with http:// or https://"] },
    details: { type: String, trim: true, maxlength: 2000 },
    audience: { type: String, enum: ["all", "department", "batch"], default: "all" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ startsAt: 1 });

export default mongoose.model("Session", sessionSchema);
