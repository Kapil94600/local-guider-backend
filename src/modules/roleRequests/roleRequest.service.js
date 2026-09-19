// src/modules/roleRequests/roleRequest.service.js
import { sequelize } from "../../config/database.js";

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
import Place from "../../database/models/core/Place.js";

const generateCardNumber = (role) => {
  const prefix = role === "GUIDER" ? "LG-G" : "LG-P";
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomNum}`;
};

const getPlaceNames = async (placeIds) => {
  if (!placeIds || placeIds.length === 0) return [];
  try {
    const places = await Place.findAll({
      where: { id: placeIds },
      attributes: ["id", "name"],
    });
    return places.map((p) => p.name);
  } catch {
    return [];
  }
};

// ═══════════════════════════════════════════
// CREATE ROLE REQUEST
// ═══════════════════════════════════════════
export const addRoleRequest = async (userId, requestedRole, details) => {
  if (!["GUIDER", "PHOTOGRAPHER"].includes(requestedRole)) {
    throw new Error("Invalid requested role");
  }

  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  if (user.role === requestedRole)
    throw new Error(`User is already ${requestedRole}`);

  const existingRequest = await getPendingUserRequest(userId, requestedRole);
  if (existingRequest) throw new Error("A pending request already exists");

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

// ═══════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════
export const fetchRoleRequests = async () => getRoleRequests();
export const fetchMyRoleRequests = async (userId) =>
  getUserRoleRequests(userId);

export const fetchRoleRequest = async (id) => {
  const request = await getRoleRequestById(id);
  if (!request) throw new Error("Role request not found");
  return request;
};

// ═══════════════════════════════════════════
// ✅ FIXED: processRoleRequest
//   - Uses transaction
//   - Direct User.update() to bypass hooks
//   - Verifies role actually changed
//   - Detailed console logs
// ═══════════════════════════════════════════
export const processRoleRequest = async (id, status, adminMessage) => {
  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw new Error("Invalid request status");
  }

  const request = await getRoleRequestById(id);
  if (!request) throw new Error("Role request not found");
  if (request.status !== "PENDING") {
    throw new Error("This request has already been processed");
  }

  // If REJECTED, just update status
  if (status === "REJECTED") {
    return await updateRoleRequest(id, {
      status,
      adminMessage: adminMessage || null,
    });
  }

  // ═══════════════════════════════════════════
  // APPROVED — Transaction
  // ═══════════════════════════════════════════
  const t = await sequelize.transaction();

  try {
    const user = await User.findByPk(request.userId, { transaction: t });
    if (!user) throw new Error("User not found");

    console.log(`🔵 [processRoleRequest] Approving request ${id}`);
    console.log(`   User: ${user.email}`);
    console.log(`   Old role: ${user.role}`);
    console.log(`   New role: ${request.requestedRole}`);

    // 1. Update user role — DIRECT UPDATE (bypasses any hooks)
    await User.update(
      { role: request.requestedRole },
      { where: { id: user.id }, transaction: t }
    );

    // Verify the update actually worked
    const verifyUser = await User.findByPk(user.id, { transaction: t });
    console.log(`✅ Role updated in DB: ${verifyUser.role}`);

    if (verifyUser.role !== request.requestedRole) {
      throw new Error(
        `Role update failed — expected ${request.requestedRole}, got ${verifyUser.role}`
      );
    }

    // 2. Build profile data
    const profileData = {
      userId: user.id,
      fullName: request.fullName || verifyUser.firstName,
      companyName: request.companyName || null,
      location: request.location || null,
      selfieUrl: request.selfieUrl || null,
      idFrontUrl: request.idFrontUrl || null,
      idBackUrl: request.idBackUrl || null,
      profilePhotoUrl: request.profilePhotoUrl || null,
      placeIds: Array.isArray(request.placeIds)
        ? request.placeIds.map(String)
        : [],
      experience: 0,
      bio: request.message || "",
      isActive: true,
    };

    const placeNames = await getPlaceNames(profileData.placeIds);

    // 3. Create/Update Guider or Photographer profile
    if (request.requestedRole === "GUIDER") {
      const existing = await Guider.findOne({
        where: { userId: user.id },
        transaction: t,
      });
      if (existing) {
        await existing.update(profileData, { transaction: t });
        console.log(`✅ Guider profile updated`);
      } else {
        await Guider.create(
          { ...profileData, languages: [] },
          { transaction: t }
        );
        console.log(`✅ Guider profile created`);
      }

      // ID Card
      const existingCard = await IdCard.findOne({
        where: { userId: user.id, role: "GUIDER" },
        transaction: t,
      });
      if (!existingCard) {
        await IdCard.create(
          {
            userId: user.id,
            role: "GUIDER",
            cardNumber: generateCardNumber("GUIDER"),
            fullName: profileData.fullName,
            companyName: profileData.companyName,
            location: profileData.location,
            placeIds: profileData.placeIds,
            placeNames,
            profileImage: profileData.profilePhotoUrl,
            issueDate: new Date(),
            expiryDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            ),
            status: "ACTIVE",
          },
          { transaction: t }
        );
        console.log(`✅ IdCard created for Guider`);
      }
    } else if (request.requestedRole === "PHOTOGRAPHER") {
      const existing = await Photographer.findOne({
        where: { userId: user.id },
        transaction: t,
      });
      if (existing) {
        await existing.update(profileData, { transaction: t });
        console.log(`✅ Photographer profile updated`);
      } else {
        await Photographer.create(profileData, { transaction: t });
        console.log(`✅ Photographer profile created`);
      }

      // ID Card
      const existingCard = await IdCard.findOne({
        where: { userId: user.id, role: "PHOTOGRAPHER" },
        transaction: t,
      });
      if (!existingCard) {
        await IdCard.create(
          {
            userId: user.id,
            role: "PHOTOGRAPHER",
            cardNumber: generateCardNumber("PHOTOGRAPHER"),
            fullName: profileData.fullName,
            companyName: profileData.companyName,
            location: profileData.location,
            placeIds: profileData.placeIds,
            placeNames,
            profileImage: profileData.profilePhotoUrl,
            issueDate: new Date(),
            expiryDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            ),
            status: "ACTIVE",
          },
          { transaction: t }
        );
        console.log(`✅ IdCard created for Photographer`);
      }
    }

    // 4. Update role request status
    await updateRoleRequest(id, {
      status,
      adminMessage: adminMessage || null,
    });

    await t.commit();
    console.log(`✅ [processRoleRequest] Transaction committed\n`);

    // Return fresh request
    return await getRoleRequestById(id);
  } catch (error) {
    await t.rollback();
    console.error(`❌ [processRoleRequest] Rollback:`, error.message);
    throw error;
  }
};