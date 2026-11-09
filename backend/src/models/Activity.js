import mongoose from "mongoose";

// Points for the impact score. Selected also counts the registration,
// so a selected activity is worth 5 + 15 = 20.
export const POINTS = { registered: 5, selected: 15 };
export const pointsFor = (stage) => (stage === "selected" ? POINTS.registered + POINTS.selected : POINTS.registered);

export const CATEGORIES = ["hackathon", "project", "internship", "open_source", "program", "side_hustle", "other"];

// One thing a student did outside class: a hackathon, an internship, an open source selection...
// The student adds it with a proof link, and a reviewer approves it before the points count.
const activitySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true }, // copied for fast leaderboards
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: CATEGORIES, required: true },
    stage: { type: String, enum: ["registered", "selected"], required: true },
    proofUrl: {
      type: String,
      required: [true, "Add a proof link"],
      trim: true,
      match: [/^https?:\/\/\S+$/i, "Proof must be a link starting with http:// or https://"],
    },
    date: { type: Date },

    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    points: { type: Number, default: 0 }, // what this activity is worth at its current stage
    approvedPoints: { type: Number, default: 0 }, // what actually counts in the score
    reviewNote: { type: String, trim: true, maxlength: 300 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

activitySchema.pre("validate", function () {
  this.points = pointsFor(this.stage);
});

activitySchema.index({ student: 1, createdAt: -1 });
activitySchema.index({ batch: 1, status: 1 });

export default mongoose.model("Activity", activitySchema);
