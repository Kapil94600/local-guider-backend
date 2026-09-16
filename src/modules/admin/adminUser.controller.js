import { ApiResponse } from "../../utils/apiResponse.js";
import {
  createAdmin,
  fetchUsers,
  fetchUser,
  changeUserStatus,
  removeUser,
} from "./adminUser.service.js";

export const createAdminUser = async (req, res, next) => {
  try {
    const admin = await createAdmin(req.body);
    return ApiResponse.success(res, "Admin created successfully", admin);
  } catch (error) { next(error); }
};

export const getUsers = async (req, res, next) => {
  try {
    // ✅ Saare params pass karo (search, role, status, page, limit)
    const users = await fetchUsers(req.query);
    return ApiResponse.success(res, "Users fetched successfully", users);
  } catch (error) { next(error); }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await fetchUser(req.params.id);
    return ApiResponse.success(res, "User fetched successfully", user);
  } catch (error) { next(error); }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const user = await changeUserStatus(req.params.id, req.body.isActive);
    return ApiResponse.success(res, "User status updated successfully", user);
  } catch (error) { next(error); }
};

export const deleteUser = async (req, res, next) => {
  try {
    const result = await removeUser(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};