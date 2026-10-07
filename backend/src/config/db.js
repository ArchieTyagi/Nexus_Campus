import mongoose from "mongoose";

// Connects to MongoDB using the URL from .env
export const connectDB = async () => {
  const url = process.env.MONGO_URI;
  if (!url) {
    console.error("MONGO_URI is missing in .env");
    process.exit(1);
  }
  await mongoose.connect(url);
  console.log("MongoDB connected");
};
