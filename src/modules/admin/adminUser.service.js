import {
  findUserByEmail,
  createAdminUser,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUserById,
} from "./adminUser.repository.js";
import bcrypt from "bcryptjs";

export const createAdmin = async (payload) => {
  if (!payload.firstName || !payload.email || !payload.password) {
    throw new Error("firstName, email and password are required");
  }
  const existingUser = await findUserByEmail(payload.email);
  if (existingUser) throw new Error("User with this email already exists");
  const passwordHash = await bcrypt.hash(payload.password, 10);
  const admin = await createAdminUser({
    firstName: payload.firstName,
    lastName: payload.lastName || null,
    email: payload.email,
    phone: payload.phone || null,
    passwordHash,
    role: "ADMIN",
    isActive: true,
  });
  const response = admin.toJSON();
  delete response.passwordHash;
  return response;
};

// ✅ Params accept karo
export const fetchUsers = async (params = {}) => {
  return await getAllUsers(params);
};

export const fetchUser = async (id) => {
  const user = await getUserById(id);
  if (!user) throw new Error("User not found");
  return user;
};

export const changeUserStatus = async (id, isActive) => {
  if (typeof isActive !== "boolean") throw new Error("isActive must be true or false");
  const user = await updateUserStatus(id, isActive);
  if (!user) throw new Error("User not found");
  return user;
};

export const removeUser = async (id) => {
  const result = await deleteUserById(id);
  if (!result) throw new Error("User not found");
  return { message: "User deleted successfully" };
};