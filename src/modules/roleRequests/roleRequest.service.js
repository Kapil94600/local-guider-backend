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

export const fetchRoleRequests = async () => getRoleRequests();
export const fetchMyRoleRequests = async (userId) =>
  getUserRoleRequests(userId);

export const fetchRoleRequest = async (id) => {
  const request = await getRoleRequestById(id);
  if (!request) throw new Error("Role request not found");
  return request;
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIXED: processRoleRequest — with transaction + fresh fetch + logs
// ═══════════════════════════════════════════════════════════════
export const processRoleRequest = async (id, status, adminMessage) => {
  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw new Error("Invalid request status");
  }

  const request = await getRoleRequestById(id);
  if (!request) throw new Error("Role request not found");
  if (request.status !== "PENDING") {
    throw new Error("This request has already been processed");
  }

  if (status === "REJECTED") {
    return await updateRoleRequest(id, {
      status,
      adminMessage: adminMessage || null,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // APPROVED — Transaction me sab kuch atomically karo
  // ═══════════════════════════════════════════════════════════════
  const transaction = await sequelize.transaction();

  try {
    // 1. Fresh user fetch
    const user = await User.findByPk(request.userId, { transaction });
    if (!user) throw new Error("User not found");

    console.log(`🔵 Processing approval for user ${user.id} (${user.email})`);
    console.log(`   Current role: ${user.role}`);
    console.log(`   New role: ${request.requestedRole}`);

    // 2. Update user role — DIRECT UPDATE to bypass any hooks/validation
    await User.update(
      { role: request.requestedRole },
      { where: { id: user.id }, transaction }
    );

    // Verify
    const updatedUser = await User.findByPk(user.id, { transaction });
    console.log(`✅ User role updated in DB: ${updatedUser.role}`);

    if (updatedUser.role !== request.requestedRole) {
      throw new Error(
        `Role update failed. Expected ${request.requestedRole}, got ${updatedUser.role}`
      );
    }

    // 3. Common profile data
    const profileData = {
      userId: user.id,
      fullName: request.fullName || updatedUser.firstName,
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

    // 4. Create/Update Guider or Photographer
    if (request.requestedRole === "GUIDER") {
      const existing = await Guider.findOne({
        where: { userId: user.id },
        transaction,
      });
      if (existing) {
        await existing.update(profileData, { transaction });
        console.log(`✅ Guider profile updated for ${user.id}`);
      } else {
        await Guider.create(
          { ...profileData, languages: [] },
          { transaction }
        );
        console.log(`✅ Guider profile created for ${user.id}`);
      }

      // 5. ID Card
      const existingCard = await IdCard.findOne({
        where: { userId: user.id, role: "GUIDER" },
        transaction,
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
          { transaction }
        );
        console.log(`✅ ID Card created for Guider: ${user.id}`);
      } else {
        await existingCard.update(
          {
            fullName: profileData.fullName,
            companyName: profileData.companyName,
            location: profileData.location,
            placeIds: profileData.placeIds,
            placeNames,
            profileImage: profileData.profilePhotoUrl,
          },
          { transaction }
        );
        console.log(`✅ ID Card updated for Guider: ${user.id}`);
      }
    } else if (request.requestedRole === "PHOTOGRAPHER") {
      const existing = await Photographer.findOne({
        where: { userId: user.id },
        transaction,
      });
      if (existing) {
        await existing.update(profileData, { transaction });
        console.log(`✅ Photographer profile updated for ${user.id}`);
      } else {
        await Photographer.create(profileData, { transaction });
        console.log(`✅ Photographer profile created for ${user.id}`);
      }

      const existingCard = await IdCard.findOne({
        where: { userId: user.id, role: "PHOTOGRAPHER" },
        transaction,
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
          { transaction }
        );
        console.log(`✅ ID Card created for Photographer: ${user.id}`);
      } else {
        await existingCard.update(
          {
            fullName: profileData.fullName,
            companyName: profileData.companyName,
            location: profileData.location,
            placeIds: profileData.placeIds,
            placeNames,
            profileImage: profileData.profilePhotoUrl,
          },
          { transaction }
        );
        console.log(`✅ ID Card updated for Photographer: ${user.id}`);
      }
    } else {
      throw new Error("Unsupported role");
    }

    // 6. Update role request status
    await updateRoleRequest(id, {
      status,
      adminMessage: adminMessage || null,
    });

    // Commit
    await transaction.commit();
    console.log(`✅ Transaction committed for request ${id}`);

    return await getRoleRequestById(id);
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ processRoleRequest transaction failed:`, error.message);
    throw error;
  }
};