import mongoose from "mongoose";

export const SESSION_MINUTES = 10; // a QR session stays open this long
export const QR_SECONDS = 30; // the QR code changes this often

// One class where attendance was taken.
// Every session counts as one class held for that course and batch.
const sessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true },
    closedAt: { type: Date },
    secret: { type: String, required: true, select: false }, // used to make the changing QR codes
  },
  { timestamps: true }
);

sessionSchema.virtual("isOpen").get(function () {
  return !this.closedAt && this.endsAt > new Date();
});

sessionSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.secret;
    delete ret.__v;
    return ret;
  },
});

sessionSchema.index({ course: 1, batch: 1, startedAt: -1 });

export default mongoose.model("AttendanceSession", sessionSchema);
