// src/modules/users/user.service.js
import bcrypt from "bcryptjs";
import { findUserById, updateUserById, updatePassword } from "./user.repository.js";

export const getProfile = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");
  const response = user.toJSON();
  delete response.passwordHash;
  return response;
};

export const updateProfile = async (userId, payload) => {
  const user = await updateUserById(userId, payload);
  if (!user) throw new Error("User not found");
  const response = user.toJSON();
  delete response.passwordHash;
  return response;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");

  // ✅ FIX: guard null passwordHash (Google/OTP users)
  if (!user.passwordHash) {
    throw new Error("This account was created with OTP/Google. Password change not available.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new Error("Current password is incorrect");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await updatePassword(userId, hashedPassword);

  return { message: "Password changed successfully" };
};