// src/modules/admin/adminRoleRequest.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import { sequelize } from "../../config/database.js";
import RoleRequest from "../../database/models/core/RoleRequest.js";
import User from "../../database/models/core/User.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import IdCard from "../../database/models/core/IdCard.js";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

// ═══════════════════════════════════════════════════════════════
// ✅ HELPER: Generate unique card number
// ═══════════════════════════════════════════════════════════════
const generateCardNumber = (role) => {
  const prefix = role === "GUIDER" ? "LG-G" : "LG-P";
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomNum}`;
};

// ═══════════════════════════════════════════════════════════════
// GET ALL ROLE REQUESTS
// ═══════════════════════════════════════════════════════════════
export const getRoleRequests = async (req, res, next) => {
  try {
    const roleRequests = await RoleRequest.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "email",
            "phone",
            "profileImage",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return ApiResponse.success(res, "Role requests fetched", roleRequests);
  } catch (error) {
    next(error);
  }
};
// ═══════════════════════════════════════════════════════════════
// ✅ FEATURE B-19: UPDATE ROLE REQUEST DOCS (Admin only)
// Allows admin to fix/upload docs before approval
// ═══════════════════════════════════════════════════════════════
export const updateRoleRequestDocs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      selfieUrl,
      idFrontUrl,
      idBackUrl,
      profilePhotoUrl,
      fullName,
      companyName,
      location,
      idType,
    } = req.body;

    const roleRequest = await RoleRequest.findByPk(id);
    if (!roleRequest) {
      return res.status(404).json({
        success: false,
        message: "Role request not found",
      });
    }

    // ✅ Only PENDING requests can be edited
    if (roleRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a ${roleRequest.status.toLowerCase()} request`,
      });
    }

    // ✅ Build update payload — only provided fields
    const updatePayload = {};

    if (selfieUrl !== undefined) updatePayload.selfieUrl = selfieUrl;
    if (idFrontUrl !== undefined) updatePayload.idFrontUrl = idFrontUrl;
    if (idBackUrl !== undefined) updatePayload.idBackUrl = idBackUrl;
    if (profilePhotoUrl !== undefined)
      updatePayload.profilePhotoUrl = profilePhotoUrl;
    if (fullName !== undefined && fullName.trim())
      updatePayload.fullName = fullName.trim();
    if (companyName !== undefined) updatePayload.companyName = companyName;
    if (location !== undefined && location.trim())
      updatePayload.location = location.trim();
    if (idType !== undefined) {
      const allowedIdTypes = [
        "AADHAAR",
        "PAN",
        "DRIVING_LICENSE",
        "VOTER_ID",
        "PASSPORT",
        "OTHER",
      ];
      if (allowedIdTypes.includes(idType)) {
        updatePayload.idType = idType;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    await roleRequest.update(updatePayload);

    console.log(
      `✅ Role request ${id.slice(0, 8)} docs updated by admin ${req.user.id.slice(0, 8)}`
    );

    return ApiResponse.success(
      res,
      "Role request documents updated",
      roleRequest
    );
  } catch (error) {
    console.error("❌ updateRoleRequestDocs error:", error.message);
    next(error);
  }
};
// ═══════════════════════════════════════════════════════════════
// UPDATE ROLE REQUEST STATUS (APPROVE/REJECT)
// ═══════════════════════════════════════════════════════════════
export const updateRoleRequestStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status, adminMessage } = req.body;

    const roleRequest = await RoleRequest.findByPk(id, { transaction });
    if (!roleRequest) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Role request not found" });
    }

    if (roleRequest.status === status) {
      await transaction.rollback();
      return ApiResponse.success(res, "Already in this status", roleRequest);
    }

    // ═══════════════════════════════════════════════════════════════
    // APPROVE — everything INSIDE transaction (atomic)
    // ═══════════════════════════════════════════════════════════════
    if (status === "APPROVED") {
      const userId = roleRequest.userId;
      const role = roleRequest.requestedRole;

      // 1. Update user role
      await User.update({ role }, { where: { id: userId }, transaction });

      // 2. Create provider profile
      const profileData = {
        userId,
        fullName: roleRequest.fullName,
        companyName: roleRequest.companyName,
        location: roleRequest.location,
        selfieUrl: roleRequest.selfieUrl,
        idFrontUrl: roleRequest.idFrontUrl,
        idBackUrl: roleRequest.idBackUrl,
        profilePhotoUrl: roleRequest.profilePhotoUrl,
        placeIds: roleRequest.placeIds || [],
        bio: roleRequest.message || "",
        experience: 0,
        isActive: true,
      };

      if (role === "GUIDER") {
        const existing = await Guider.findOne({
          where: { userId },
          transaction,
        });
        if (!existing) {
          await Guider.create(
            { ...profileData, languages: [] },
            { transaction }
          );
        }
      } else if (role === "PHOTOGRAPHER") {
        const existing = await Photographer.findOne({
          where: { userId },
          transaction,
        });
        if (!existing) {
          await Photographer.create(profileData, { transaction });
        }
      }

      // ═══════════════════════════════════════════════════════════
      // ✅ FIX B-3: ID CARD CREATION INSIDE TRANSACTION
      // (Previously: fire-and-forget after commit — could fail silently)
      // ═══════════════════════════════════════════════════════════
      const existingCard = await IdCard.findOne({
        where: { userId },
        transaction,
      });

      if (!existingCard) {
        // Fetch place names for card
        const Place = (
          await import("../../database/models/core/Place.js")
        ).default;
        const placeIds = roleRequest.placeIds || [];
        let placeNames = [];

        if (placeIds.length > 0) {
          try {
            const places = await Place.findAll({
              where: { id: placeIds },
              attributes: ["name"],
              transaction,
            });
            placeNames = places.map((p) => p.name);
          } catch (e) {
            console.warn("Place names fetch failed:", e.message);
          }
        }

        await IdCard.create(
          {
            userId,
            role,
            cardNumber: generateCardNumber(role),
            fullName: roleRequest.fullName,
            companyName: roleRequest.companyName,
            location: roleRequest.location,
            placeIds,
            placeNames,
            profileImage: roleRequest.profilePhotoUrl,
            issueDate: new Date(),
            expiryDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            ),
            status: "ACTIVE",
          },
          { transaction }
        );

        console.log(
          `✅ ID card created in-transaction for user ${userId.slice(0, 8)}`
        );
      }
    }

    // Update role request
    await roleRequest.update(
      { status, adminMessage: adminMessage || null },
      { transaction }
    );

    await transaction.commit();
    await roleRequest.reload();

    // ═══════════════════════════════════════════════════════════════
    // ✅ FIX B-5: SOCKET EMIT + FORCE RECONNECT (fresh token)
    // ═══════════════════════════════════════════════════════════════
    if (status === "APPROVED") {
      try {
        const user = await User.findByPk(roleRequest.userId, {
          attributes: {
            exclude: [
              "passwordHash",
              "googleId",
              "resetTokenHash",
              "resetTokenExpires",
            ],
          },
        });

        const io = req.app.get("io");

        if (io && user) {
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

          // ✅ FIX B-5: Force disconnect sockets so client reconnects
          // with the fresh token → new role in socket metadata
          const userSockets = await io
            .in(`user:${user.id}`)
            .fetchSockets();

          for (const s of userSockets) {
            s.disconnect(true); // Client will auto-reconnect
          }

          console.log(
            `🔌 Disconnected ${userSockets.length} socket(s) for fresh role sync`
          );
        }
      } catch (socketErr) {
        console.error("❌ Socket emit failed:", socketErr.message);
      }
    }

    return ApiResponse.success(
      res,
      `Role request ${status.toLowerCase()}`,
      roleRequest
    );
  } catch (error) {
    await transaction.rollback();
    console.error("❌ updateRoleRequestStatus error:", error);
    next(error);
  }
};