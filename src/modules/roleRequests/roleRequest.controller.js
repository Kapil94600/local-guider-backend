// src/modules/roleRequests/roleRequest.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addRoleRequest,
  fetchRoleRequests,
  fetchMyRoleRequests,
  fetchRoleRequest,
  processRoleRequest,
} from "./roleRequest.service.js";
import User from "../../database/models/core/User.js"; // ✅ ADDED

export const createRoleRequest = async (req, res, next) => {
  try {
    const requestedRole = req.body.requestedRole || req.body.role;
    const { message, fullName, companyName, location } = req.body;

    if (!requestedRole || !["GUIDER", "PHOTOGRAPHER"].includes(requestedRole)) {
      return res.status(400).json({ success: false, message: "Invalid role. Must be GUIDER or PHOTOGRAPHER" });
    }

    if (!fullName || !location) {
      return res.status(400).json({ success: false, message: "Full name aur location zaroori hai" });
    }

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
      return res.status(400).json({ success: false, message: "Kam se kam 1 place select karna zaroori hai" });
    }
    if (placeIds.length > 3) {
      return res.status(400).json({ success: false, message: "Zyada se zyada 3 places select kar sakte ho" });
    }

    const selfieUrl = req.files?.selfie?.[0] ? `/uploads/${req.files.selfie[0].filename}` : null;
    const idFrontUrl = req.files?.idFront?.[0] ? `/uploads/${req.files.idFront[0].filename}` : null;
    const idBackUrl = req.files?.idBack?.[0] ? `/uploads/${req.files.idBack[0].filename}` : null;
    const profilePhotoUrl = req.files?.profilePhoto?.[0] ? `/uploads/${req.files.profilePhoto[0].filename}` : null;

    if (!selfieUrl || !idFrontUrl || !idBackUrl || !profilePhotoUrl) {
      return res.status(400).json({ success: false, message: "Selfie, ID front, ID back, aur profile photo — sabhi zaroori hain" });
    }

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
    });

    return ApiResponse.success(res, "Role request created successfully", request);
  } catch (error) {
    next(error);
  }
};

export const getMyRoleRequests = async (req, res, next) => {
  try {
    const requests = await fetchMyRoleRequests(req.user.id);
    return ApiResponse.success(res, "Role requests fetched successfully", requests);
  } catch (error) { next(error); }
};

export const getAllRoleRequests = async (req, res, next) => {
  try {
    const requests = await fetchRoleRequests();
    return ApiResponse.success(res, "All role requests fetched successfully", requests);
  } catch (error) { next(error); }
};

export const getRoleRequest = async (req, res, next) => {
  try {
    const request = await fetchRoleRequest(req.params.id);
    return ApiResponse.success(res, "Role request fetched successfully", request);
  } catch (error) { next(error); }
};

// ✅ UPDATED: Emit role:updated socket event on APPROVED
export const updateRoleRequest = async (req, res, next) => {
  try {
    const { status, adminMessage } = req.body;
    const request = await processRoleRequest(req.params.id, status, adminMessage);

    // ✅ Emit real-time role update to the user
    if (status === "APPROVED" && request) {
      try {
        const user = await User.findByPk(request.userId);
        const io = req.app.get("io");

        if (io && user) {
          io.to(`user:${user.id}`).emit("role:updated", {
            userId: user.id,
            newRole: user.role,
            user: user.toJSON(),
          });
          console.log(`📡 role:updated emitted → user:${user.id} (${user.role})`);
        } else {
          console.log("⚠️ Socket emit skipped — io or user missing");
        }
      } catch (socketErr) {
        console.error("❌ Socket emit failed:", socketErr.message);
        // Don't fail the request if socket fails
      }
    }

    return ApiResponse.success(res, `Role request ${status.toLowerCase()} successfully`, request);
  } catch (error) { next(error); }
};