// src/modules/roleRequests/roleRequest.service.js
import {
  createRoleRequest,
  getRoleRequests,
  getRoleRequestById,
  getUserRoleRequests,
  getPendingUserRequest,
} from "./roleRequest.repository.js";
import User from "../../database/models/core/User.js";
import { ApiError } from "../../utils/apiError.js";

// ═══════════════════════════════════════════════════════════════
// CREATE ROLE REQUEST (user-side)
// ═══════════════════════════════════════════════════════════════
export const addRoleRequest = async (userId, requestedRole, details) => {
  if (!["GUIDER", "PHOTOGRAPHER"].includes(requestedRole)) {
    throw new ApiError(400, "Invalid requested role");
  }

  const user = await User.findByPk(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (user.role === requestedRole) {
    throw new ApiError(400, `User is already ${requestedRole}`);
  }

  const existingRequest = await getPendingUserRequest(userId, requestedRole);
  if (existingRequest) {
    throw new ApiError(409, "A pending request already exists");
  }

  const placeIds = Array.isArray(details.placeIds)
    ? details.placeIds.map(String)
    : [];

  return await createRoleRequest({
    userId,
    requestedRole,
    status: "PENDING",
    message: details.message || null,
    fullName: details.fullName,
    companyName: details.companyName || null,
    location: details.location,
    selfieUrl: details.selfieUrl,
    idFrontUrl: details.idFrontUrl,
    idBackUrl: details.idBackUrl,
    profilePhotoUrl: details.profilePhotoUrl,
    placeIds,
    idType: details.idType || "AADHAAR",
  });
};

// ═══════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════
export const fetchRoleRequests = async () => getRoleRequests();

export const fetchMyRoleRequests = async (userId) =>
  getUserRoleRequests(userId);

export const fetchRoleRequest = async (id) => {
  const request = await getRoleRequestById(id);
  if (!request) throw new ApiError(404, "Role request not found");
  return request;
};

// ═══════════════════════════════════════════════════════════════
// NOTE: processRoleRequest() REMOVED
// ═══════════════════════════════════════════════════════════════
// Admin approval logic consolidated into:
//   → src/modules/admin/adminRoleRequest.controller.js
//
// Reason: Avoid duplicate logic. Both had same transaction +
//         profile creation + ID card code.
// ═══════════════════════════════════════════════════════════════