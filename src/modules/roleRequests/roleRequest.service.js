// src/modules/roleRequests/roleRequest.service.js
import {
  createRoleRequest,
  getRoleRequests,
  getRoleRequestById,
  getUserRoleRequests,
  getPendingUserRequest,
  updateRoleRequest,
} from "./roleRequest.repository.js";

import User from "../../database/models/core/User.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import IdCard from "../../database/models/core/IdCard.js";
import Place from "../../database/models/core/Place.js";   // ✅ Add this

// Helper to generate unique card number
const generateCardNumber = (role) => {
  const prefix = role === 'GUIDER' ? 'LG-G' : 'LG-P';
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomNum}`;
};

// ✅ Helper: Get place names from IDs
const getPlaceNames = async (placeIds) => {
  if (!placeIds || placeIds.length === 0) return [];
  try {
    const places = await Place.findAll({
      where: { id: placeIds },
      attributes: ["id", "name"],
    });
    return places.map(p => p.name);
  } catch {
    return [];
  }
};

// ✅ Create Role Request
export const addRoleRequest = async (userId, requestedRole, details) => {
  if (!["GUIDER", "PHOTOGRAPHER"].includes(requestedRole)) {
    throw new Error("Invalid requested role");
  }

  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  if (user.role === requestedRole) throw new Error(`User is already ${requestedRole}`);

  const existingRequest = await getPendingUserRequest(userId, requestedRole);
  if (existingRequest) throw new Error("A pending request already exists");

  const placeIds = Array.isArray(details.placeIds) ? details.placeIds.map(String) : [];

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
  });
};

// ✅ Fetch All Role Requests (Admin)
export const fetchRoleRequests = async () => {
  return await getRoleRequests();
};

// ✅ Fetch My Role Requests (User)
export const fetchMyRoleRequests = async (userId) => {
  return await getUserRoleRequests(userId);
};

// ✅ Fetch Single Role Request
export const fetchRoleRequest = async (id) => {
  const request = await getRoleRequestById(id);
  if (!request) throw new Error("Role request not found");
  return request;
};

// ✅ Process Role Request (Approve/Reject)
export const processRoleRequest = async (id, status, adminMessage) => {
  if (!["APPROVED", "REJECTED"].includes(status)) throw new Error("Invalid request status");

  const request = await getRoleRequestById(id);
  if (!request) throw new Error("Role request not found");
  if (request.status !== "PENDING") throw new Error("This request has already been processed");

  if (status === "APPROVED") {
    const user = await User.findByPk(request.userId);
    if (!user) throw new Error("User not found");

    // Update user role
    await user.update({ role: request.requestedRole });

    // Common profile data
    const profileData = {
      userId: user.id,
      fullName: request.fullName,
      companyName: request.companyName,
      location: request.location,
      selfieUrl: request.selfieUrl,
      idFrontUrl: request.idFrontUrl,
      idBackUrl: request.idBackUrl,
      profilePhotoUrl: request.profilePhotoUrl,
      placeIds: Array.isArray(request.placeIds) ? request.placeIds.map(String) : [],
      experience: 0,
      bio: request.message || "",
      isActive: true,
    };

    // ✅ Get place names
    const placeNames = await getPlaceNames(profileData.placeIds);

    // ✅ Create/Update Guider or Photographer profile
    if (request.requestedRole === "GUIDER") {
      const existing = await Guider.findOne({ where: { userId: user.id } });
      if (existing) {
        await existing.update(profileData);
      } else {
        await Guider.create({ ...profileData, languages: [] });
      }

      // ✅ Create ID Card for Guider
      const existingCard = await IdCard.findOne({ where: { userId: user.id, role: 'GUIDER' } });
      if (!existingCard) {
        await IdCard.create({
          userId: user.id,
          role: 'GUIDER',
          cardNumber: generateCardNumber('GUIDER'),
          fullName: request.fullName || user.firstName,
          companyName: request.companyName || null,
          location: request.location || null,
          placeIds: profileData.placeIds,
          placeNames: placeNames,   // ✅ Save place names
          profileImage: request.profilePhotoUrl || null,
          issueDate: new Date(),
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          status: 'ACTIVE',
        });
        console.log(`✅ ID Card created for Guider: ${user.id}`);
      } else {
        // ✅ Update existing card with new data
        await existingCard.update({
          fullName: request.fullName || user.firstName,
          companyName: request.companyName || null,
          location: request.location || null,
          placeIds: profileData.placeIds,
          placeNames: placeNames,
          profileImage: request.profilePhotoUrl || null,
        });
      }
    } else if (request.requestedRole === "PHOTOGRAPHER") {
      const existing = await Photographer.findOne({ where: { userId: user.id } });
      if (existing) {
        await existing.update(profileData);
      } else {
        await Photographer.create(profileData);
      }

      // ✅ Create ID Card for Photographer
      const existingCard = await IdCard.findOne({ where: { userId: user.id, role: 'PHOTOGRAPHER' } });
      if (!existingCard) {
        await IdCard.create({
          userId: user.id,
          role: 'PHOTOGRAPHER',
          cardNumber: generateCardNumber('PHOTOGRAPHER'),
          fullName: request.fullName || user.firstName,
          companyName: request.companyName || null,
          location: request.location || null,
          placeIds: profileData.placeIds,
          placeNames: placeNames,   // ✅ Save place names
          profileImage: request.profilePhotoUrl || null,
          issueDate: new Date(),
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          status: 'ACTIVE',
        });
        console.log(`✅ ID Card created for Photographer: ${user.id}`);
      } else {
        // ✅ Update existing card with new data
        await existingCard.update({
          fullName: request.fullName || user.firstName,
          companyName: request.companyName || null,
          location: request.location || null,
          placeIds: profileData.placeIds,
          placeNames: placeNames,
          profileImage: request.profilePhotoUrl || null,
        });
      }
    } else {
      throw new Error("Unsupported role");
    }
  }

  return await updateRoleRequest(id, { status, adminMessage: adminMessage || null });
};