import mongoose from "mongoose";

// Study material for one batch, grouped by subject.
// For now the file lives on Google Drive (or any link) and we keep the link.
const materialSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: [true, "Pick a batch"] },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true }, // copied from the batch
    subject: { type: String, required: [true, "Add the subject"], trim: true, maxlength: 80 },
    title: { type: String, required: [true, "Add a title"], trim: true, maxlength: 150 },
    link: {
      type: String,
      required: [true, "Add the file link"],
      trim: true,
      match: [/^https?:\/\/\S+$/i, "Link must start with http:// or https://"],
    },
    note: { type: String, trim: true, maxlength: 300 },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

materialSchema.index({ batch: 1, subject: 1, createdAt: -1 });

export default mongoose.model("Material", materialSchema);
