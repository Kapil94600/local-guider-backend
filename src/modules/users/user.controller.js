// src/modules/users/user.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import { getProfile, updateProfile, changePassword } from "./user.service.js";

// ═══════════════════════════════════════════
// GET profile
// ═══════════════════════════════════════════
export const profile = async (req, res, next) => {
  try {
    const user = await getProfile(req.user.id);
    return ApiResponse.success(res, "Profile fetched successfully", user);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ FIX: Profile image upload — Cloudinary
// Old code: `/uploads/${req.file.filename}` (f.filename undefined!)
// New code: upload to Cloudinary, save secure_url
// ═══════════════════════════════════════════
export const updateProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required (field name: 'image')",
      });
    }

    // ✅ Memory storage → buffer → Cloudinary
    const imageUrl = await uploadToCloudinary(
      req.file.buffer,
      "local-guider/profiles"
    );

    if (!imageUrl) {
      throw new Error("Cloudinary upload returned empty URL");
    }

    const user = await updateProfile(req.user.id, {
      profileImage: imageUrl,
    });

    return ApiResponse.success(
      res,
      "Profile image updated successfully",
      user
    );
  } catch (error) {
    console.error("❌ updateProfileImage error:", error.message);
    next(error);
  }
};

// ═══════════════════════════════════════════
// Update profile (text fields)
// ═══════════════════════════════════════════
export const updateUserProfile = async (req, res, next) => {
  try {
    // ✅ Whitelist — prevent mass assignment
    const ALLOWED = [
      "firstName",
      "lastName",
      "email",
      "profileImage",
      "gender",
      "dob",
      "country",
      "state",
      "city",
      "language",
      "timezone",
    ];

    const safePayload = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) {
        safePayload[key] = req.body[key];
      }
    }

    const user = await updateProfile(req.user.id, safePayload);
    return ApiResponse.success(res, "Profile updated successfully", user);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// Change password
// ═══════════════════════════════════════════
export const changeUserPassword = async (req, res, next) => {
  try {
    const result = await changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};