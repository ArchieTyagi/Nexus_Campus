import User from "../models/User.js";
import Student from "../models/Student.js";
import AppError from "../utils/AppError.js";
import { createToken } from "../utils/token.js";
import { getProfile } from "../utils/profile.js";

// POST /api/auth/login
// Body: { login, password }  where login is an email or a roll number
export const login = async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) throw new AppError("Enter your email or roll number and password");

  let user;
  if (login.includes("@")) {
    user = await User.findOne({ email: login.toLowerCase().trim() }).select("+password");
  } else {
    const student = await Student.findOne({ rollNumber: login.toUpperCase().trim() });
    if (student) user = await User.findById(student.user).select("+password");
  }

  // Same message either way, so nobody can guess which part was wrong
  if (!user || !(await user.checkPassword(password))) {
    throw new AppError("Wrong login details", 401);
  }
  if (!user.isActive) throw new AppError("This account is deactivated. Contact the admin.", 403);

  const profile = await getProfile(user);
  user.password = undefined;
  res.json({ token: createToken(user), user, profile });
};

// GET /api/auth/me
export const me = async (req, res) => {
  const profile = await getProfile(req.user);
  res.json({ user: req.user, profile });
};

// POST /api/auth/change-password
// Body: { currentPassword, newPassword }
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError("Both passwords are required");
  if (newPassword.length < 8) throw new AppError("New password must be at least 8 characters");

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.checkPassword(currentPassword))) throw new AppError("Current password is wrong", 401);

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
  res.json({ message: "Password changed", token: createToken(user) });
};
