import mongoose from "mongoose";

// An internship opening shared with students. They apply through applyLink (often a Google Form)
// and can mark "I applied" here so the college knows who applied.
const internshipSchema = new mongoose.Schema(
  {
    role: { type: String, required: [true, "Add the role"], trim: true, maxlength: 120 },
    company: { type: String, required: [true, "Add the company"], trim: true, maxlength: 120 },
    mode: { type: String, enum: ["remote", "onsite", "hybrid"], default: "remote" },
    location: { type: String, trim: true, maxlength: 120 },
    stipend: { type: String, trim: true, maxlength: 60 }, // free text, for example "15,000 / month"
    duration: { type: String, trim: true, maxlength: 60 }, // for example "3 months"
    eligibility: { type: String, trim: true, maxlength: 300 },
    details: { type: String, trim: true, maxlength: 3000 },
    applyLink: {
      type: String,
      required: [true, "Add the apply link"],
      trim: true,
      match: [/^https?:\/\/\S+$/i, "Link must start with http:// or https://"],
    },
    deadline: { type: Date, required: [true, "Add the last date to apply"] },
    audience: { type: String, enum: ["all", "department", "batch"], default: "all" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    applied: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], // students who said they applied
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

internshipSchema.index({ deadline: 1 });

export default mongoose.model("Internship", internshipSchema);
