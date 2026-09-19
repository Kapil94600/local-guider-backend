// src/modules/roleRequests/roleRequest.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addRoleRequest,
  fetchRoleRequests,
  fetchMyRoleRequests,
  fetchRoleRequest,
  processRoleRequest,
} from "./roleRequest.service.js";
import User from "../../database/models/core/User.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
// ═══════════════════════════════════════════
// CREATE ROLE REQUEST — Cloudinary upload
// ═══════════════════════════════════════════
export const createRoleRequest = async (req, res, next) => {
  try {
    const requestedRole = req.body.requestedRole || req.body.role;
    const { message, fullName, companyName, location, idType } = req.body;

    // ── Validate role ──
    if (!requestedRole || !["GUIDER", "PHOTOGRAPHER"].includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be GUIDER or PHOTOGRAPHER",
      });
    }

    if (!fullName || !location) {
      return res.status(400).json({
        success: false,
        message: "Full name aur location zaroori hai",
      });
    }

    // ── Validate ID type ──
    const allowedIdTypes = [
      "AADHAAR",
      "PAN",
      "DRIVING_LICENSE",
      "VOTER_ID",
      "PASSPORT",
      "OTHER",
    ];
    const cleanIdType = allowedIdTypes.includes(idType) ? idType : "AADHAAR";

    // ── Parse placeIds ──
    let placeIds = [];
    if (Array.isArray(req.body.placeIds)) {
      placeIds = req.body.placeIds;
    } else if (typeof req.body.placeIds === "string") {
      try {
        placeIds = JSON.parse(req.body.placeIds);
      } catch {
        placeIds = [];
      }
    }
    if (!Array.isArray(placeIds)) placeIds = [];

    if (placeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kam se kam 1 place select karna zaroori hai",
      });
    }
    if (placeIds.length > 3) {
      return res.status(400).json({
        success: false,
        message: "Zyada se zyada 3 places select kar sakte ho",
      });
    }

    // ── Validate files present ──
    const files = req.files || {};
    if (
      !files.selfie?.[0] ||
      !files.idFront?.[0] ||
      !files.idBack?.[0] ||
      !files.profilePhoto?.[0]
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selfie, ID front, ID back, aur profile photo — sabhi zaroori hain",
      });
    }

    // ═══════════════════════════════════════════
    // ⚡ Upload all 4 files to Cloudinary IN PARALLEL
    // ═══════════════════════════════════════════
    console.log("📤 Uploading 4 files to Cloudinary...");
    const [selfieUrl, idFrontUrl, idBackUrl, profilePhotoUrl] =
      await Promise.all([
        uploadToCloudinary(files.selfie[0].buffer, "local-guider/role-requests"),
        uploadToCloudinary(files.idFront[0].buffer, "local-guider/role-requests"),
        uploadToCloudinary(files.idBack[0].buffer, "local-guider/role-requests"),
        uploadToCloudinary(
          files.profilePhoto[0].buffer,
          "local-guider/role-requests"
        ),
      ]);

    console.log("✅ All 4 files uploaded to Cloudinary");

    // ── Create role request in DB ──
    const request = await addRoleRequest(req.user.id, requestedRole, {
      message,
      fullName,
      companyName,
      location,
      placeIds,
      selfieUrl,
      idFrontUrl,
      idBackUrl,
      profilePhotoUrl,
      idType: cleanIdType, // ✅ NEW
    });

    return ApiResponse.success(
      res,
      "Role request created successfully",
      request
    );
  } catch (error) {
    console.error("❌ createRoleRequest error:", error.message);
    next(error);
  }
};

// ═══════════════════════════════════════════
// GET MY ROLE REQUESTS
// ═══════════════════════════════════════════
export const getMyRoleRequests = async (req, res, next) => {
  try {
    const requests = await fetchMyRoleRequests(req.user.id);
    return ApiResponse.success(
      res,
      "Role requests fetched successfully",
      requests
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// GET ALL ROLE REQUESTS (Admin)
// ═══════════════════════════════════════════
export const getAllRoleRequests = async (req, res, next) => {
  try {
    const requests = await fetchRoleRequests();
    return ApiResponse.success(
      res,
      "All role requests fetched successfully",
      requests
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// GET SINGLE ROLE REQUEST (Admin)
// ═══════════════════════════════════════════
export const getRoleRequest = async (req, res, next) => {
  try {
    const request = await fetchRoleRequest(req.params.id);
    return ApiResponse.success(
      res,
      "Role request fetched successfully",
      request
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// UPDATE ROLE REQUEST STATUS (Admin)
// ═══════════════════════════════════════════
export const updateRoleRequest = async (req, res, next) => {
  try {
    const { status, adminMessage } = req.body;
    const request = await processRoleRequest(
      req.params.id,
      status,
      adminMessage
    );

    // ✅ Emit real-time role update with fresh access token
    if (status === "APPROVED" && request) {
      try {
        const user = await User.findByPk(request.userId);
        const io = req.app.get("io");

        if (io && user) {
          // Generate fresh access token with NEW role
          const freshAccessToken = jwt.sign(
            {
              id: user.id,
              role: user.role,
              email: user.email,
            },
            env.JWT_ACCESS_SECRET,
            { expiresIn: env.JWT_ACCESS_EXPIRES || "1d" }
          );

          io.to(`user:${user.id}`).emit("role:updated", {
            userId: user.id,
            newRole: user.role,
            user: user.toJSON(),
            accessToken: freshAccessToken,
          });

          console.log(
            `📡 role:updated emitted → user:${user.id} (${user.role})`
          );
        }
      } catch (socketErr) {
        console.error("❌ Socket emit failed:", socketErr.message);
      }
    }

    return ApiResponse.success(
      res,
      `Role request ${status.toLowerCase()} successfully`,
      request
    );
  } catch (error) {
    next(error);
  }
};