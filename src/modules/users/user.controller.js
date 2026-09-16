import { ApiResponse } from "../../utils/apiResponse.js";

import {
  getProfile,
  updateProfile,
  changePassword,
} from "./user.service.js";

export const profile = async (
  req,
  res,
  next
) => {
  try {
    const user = await getProfile(
      req.user.id
    );

    return ApiResponse.success(
      res,
      "Profile fetched successfully",
      user
    );
  } catch (error) {
    next(error);
  }
};

export const updateProfileImage =
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new Error(
          "Image is required"
        );
      }

      const imageUrl =
        "/uploads/" +
        req.file.filename;

      const user =
        await updateProfile(
          req.user.id,
          {
            profileImage:
              imageUrl,
          }
        );

      return ApiResponse.success(
        res,
        "Profile image updated successfully",
        user
      );
    } catch (error) {
      next(error);
    }
  };
export const updateUserProfile = async (
  req,
  res,
  next
) => {
  try {
    const user = await updateProfile(
      req.user.id,
      req.body
    );

    return ApiResponse.success(
      res,
      "Profile updated successfully",
      user
    );
  } catch (error) {
    next(error);
  }
};

export const changeUserPassword = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
      );

    return ApiResponse.success(
      res,
      result.message,
      null
    );
  } catch (error) {
    next(error);
  }
};