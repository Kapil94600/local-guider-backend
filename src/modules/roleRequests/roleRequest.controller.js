// src/modules/roleRequests/roleRequest.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addRoleRequest,
  fetchRoleRequests,
  fetchMyRoleRequests,
  fetchRoleRequest,
} from "./roleRequest.service.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════
// CREATE ROLE REQUEST
// ═══════════════════════════════════════════
export const createRoleRequest = async (req, res, next) => {
  try {
    const requestedRole = req.body.requestedRole || req.body.role;

    // ✅ NEW: extract all fields
    const {
      message,
      bio,
      fullName,
      companyName,
      location,
      idType,
      email,
      whatsappNumber,
      alternatePhone,
      dateOfBirth,
      gender,
      experience,
      languages,
    } = req.body;

    // ── Validate role ──
    if (!requestedRole || !["GUIDER", "PHOTOGRAPHER"].includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be GUIDER or PHOTOGRAPHER",
      });
    }

    // ── Basic validation ──
    if (!fullName || !location) {
      return res.status(400).json({
        success: false,
        message: "Full name and location are required",
      });
    }

    // ── Email validation (optional but must be valid if provided) ──
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // ── Phone validation (basic 10-digit check) ──
    const phoneRegex = /^[0-9]{10,15}$/;
    if (whatsappNumber && !phoneRegex.test(whatsappNumber.replace(/\D/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid WhatsApp number",
      });
    }
    if (
      alternatePhone &&
      !phoneRegex.test(alternatePhone.replace(/\D/g, ""))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid alternate phone number",
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
        message: "At least 1 place must be selected",
      });
    }
    if (placeIds.length > 3) {
      return res.status(400).json({
        success: false,
        message: "Maximum 3 places allowed",
      });
    }

    // ── Parse languages ──
    let langsArray = [];
    if (Array.isArray(languages)) {
      langsArray = languages;
    } else if (typeof languages === "string") {
      try {
        const parsed = JSON.parse(languages);
        langsArray = Array.isArray(parsed) ? parsed : [];
      } catch {
        // Comma-separated fallback
        langsArray = languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean);
      }
    }

    // ── Validate files ──
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
          "Selfie, ID front, ID back, and profile photo are all required",
      });
    }

    // ═══════════════════════════════════════════
    // ⚡ Upload all 4 files in parallel
    // ═══════════════════════════════════════════
    logger.info("📤 Uploading 4 files to Cloudinary...");
    const [selfieUrl, idFrontUrl, idBackUrl, profilePhotoUrl] =
      await Promise.all([
        uploadToCloudinary(
          files.selfie[0].buffer,
          "local-guider/role-requests"
        ),
        uploadToCloudinary(
          files.idFront[0].buffer,
          "local-guider/role-requests"
        ),
        uploadToCloudinary(
          files.idBack[0].buffer,
          "local-guider/role-requests"
        ),
        uploadToCloudinary(
          files.profilePhoto[0].buffer,
          "local-guider/role-requests"
        ),
      ]);

    logger.info("✅ All 4 files uploaded to Cloudinary");

    // ── Create role request ──
    const request = await addRoleRequest(req.user.id, requestedRole, {
      message,
      bio,
      fullName,
      companyName,
      location,
      placeIds,
      selfieUrl,
      idFrontUrl,
      idBackUrl,
      profilePhotoUrl,
      idType: cleanIdType,

      // ✅ NEW
      email,
      whatsappNumber,
      alternatePhone,
      dateOfBirth,
      gender,
      experience,
      languages: langsArray,
    });

    return ApiResponse.success(
      res,
      "Role request created successfully",
      request,
      201
    );
  } catch (error) {
    logger.error(`❌ createRoleRequest error: ${error.message}`);
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