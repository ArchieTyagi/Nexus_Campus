import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

// Checks the login token on every protected route.
// Frontend sends it as:  Authorization: Bearer <token>
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AppError("Please log in", 401);

    let data;
    try {
      data = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new AppError("Session expired, please log in again", 401);
    }

    const user = await User.findById(data.id);
    if (!user || !user.isActive) throw new AppError("Account not found or deactivated", 401);

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Only lets the listed roles through. Use after protect.
// Example: allow("admin")  or  allow("admin", "teacher")
export const allow =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to do this", 403));
    }
    next();
  };
