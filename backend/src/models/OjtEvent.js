import mongoose from "mongoose";

// A date in the OJT calendar for one batch: a viva, a meeting or a deadline
const ojtEventSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: [true, "Pick a batch"] },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true }, // copied from the batch
    type: { type: String, enum: ["viva", "meeting", "deadline"], required: true },
    title: { type: String, required: [true, "Add a title"], trim: true, maxlength: 150 },
    startsAt: { type: Date, required: [true, "Add the date and time"] },
    place: { type: String, trim: true, maxlength: 120 }, // room, for example "Seminar hall"
    link: { type: String, trim: true, match: [/^https?:\/\/\S+$/i, "Link must start with http:// or https://"] },
    details: { type: String, trim: true, maxlength: 1000 },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ojtEventSchema.index({ batch: 1, startsAt: 1 });

export default mongoose.model("OjtEvent", ojtEventSchema);
