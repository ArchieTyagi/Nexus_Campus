// Creates the first admin account. Run once:  npm run seed
// Uses ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD from .env
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const { ADMIN_NAME = "Admin", ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
  process.exit(1);
}

await connectDB();
const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
if (existing) {
  console.log(`Admin ${ADMIN_EMAIL} already exists, nothing to do`);
} else {
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" });
  console.log(`Admin created: ${ADMIN_EMAIL}. Log in and change the password.`);
}
await mongoose.disconnect();
