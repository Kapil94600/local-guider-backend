// src/modules/users/user.repository.js
import User from "../../database/models/core/User.js";

export const findUserById = async (id) => {
  return await User.findByPk(id);
};

// ✅ NEW: findUserWithPassword — for auth operations
export const findUserWithPasswordById = async (id) => {
  return await User.scope("withPassword").findByPk(id, {
    attributes: ["id", "passwordHash", "email"],
  });
};

export const findUserByEmail = async (email) => {
  return await User.findOne({
    where: { email },
  });
};

export const updateUserById = async (userId, payload) => {
  const user = await User.findByPk(userId);
  if (!user) return null;
  await user.update(payload);
  return user;
};

export const updatePassword = async (userId, passwordHash) => {
  const user = await User.findByPk(userId);
  if (!user) return null;
  user.passwordHash = passwordHash;
  await user.save();
  return user;
};

export const deactivateUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) return null;
  user.isActive = false;
  await user.save();
  return user;
};

export const activateUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) return null;
  user.isActive = true;
  await user.save();
  return user;
};