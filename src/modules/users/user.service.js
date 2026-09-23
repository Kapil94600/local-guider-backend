// src/modules/users/user.service.js
import bcrypt from "bcryptjs";
import {
  findUserById,
  findUserWithPasswordById, // ✅ NEW
  updateUserById,
  updatePassword,
} from "./user.repository.js";
import { ApiError } from "../../utils/apiError.js";

export const getProfile = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");
  const response = user.toJSON();
  // ✅ Defensive: defaultScope should already exclude these
  delete response.passwordHash;
  delete response.resetTokenHash;
  delete response.resetTokenExpires;
  delete response.googleId;
  return response;
};

export const updateProfile = async (userId, payload) => {
  const user = await updateUserById(userId, payload);
  if (!user) throw new ApiError(404, "User not found");
  const response = user.toJSON();
  delete response.passwordHash;
  delete response.resetTokenHash;
  delete response.resetTokenExpires;
  delete response.googleId;
  return response;
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-3: changePassword — use withPassword scope
// ═══════════════════════════════════════════════════════════════
export const changePassword = async (userId, currentPassword, newPassword) => {
  // Validation
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  // ✅ Use withPassword scope to get passwordHash
  const user = await findUserWithPasswordById(userId);
  if (!user) throw new ApiError(404, "User not found");

  // ✅ Guard for OTP/Google users
  if (!user.passwordHash) {
    throw new ApiError(
      400,
      "This account was created with OTP/Google. Password change not available."
    );
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new ApiError(400, "Current password is incorrect");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await updatePassword(userId, hashedPassword);

  return { message: "Password changed successfully" };
};