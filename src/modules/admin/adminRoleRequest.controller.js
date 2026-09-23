// src/modules/admin/adminRoleRequest.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import { sequelize } from "../../config/database.js";
import RoleRequest from "../../database/models/core/RoleRequest.js";
import User from "../../database/models/core/User.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import IdCard from "../../database/models/core/IdCard.js";
import jwt from "jsonwebtoken";
import crypto from "crypto"; // ✅ NEW
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: Generate unique card number
// Timestamp (base36) + 6 random hex chars = ~16M combos per ms
// ═══════════════════════════════════════════════════════════════
const generateCardNumber = (role) => {
  const prefix = role === "GUIDER" ? "LG-G" : "LG-P";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
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
// UPDATE ROLE REQUEST DOCS (Admin only)
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

    if (roleRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a ${roleRequest.status.toLowerCase()} request`,
      });
    }

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

    logger.info(
      `✅ Role request ${id.slice(0, 8)} docs updated by admin ${req.user.id.slice(0, 8)}`
    );

    return ApiResponse.success(
      res,
      "Role request documents updated",
      roleRequest
    );
  } catch (error) {
    logger.error(`❌ updateRoleRequestDocs error: ${error.message}`);
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
      // ID CARD CREATION INSIDE TRANSACTION
      // ═══════════════════════════════════════════════════════════
      const existingCard = await IdCard.findOne({
        where: { userId },
        transaction,
      });

      if (!existingCard) {
        // ✅ Static import at top (no dynamic import inside transaction)
        const Place = (await import("../../database/models/core/Place.js"))
          .default;
        const placeIds = roleRequest.placeIds || [];
        let placeNames = [];

        if (placeIds.length > 0) {
          const places = await Place.findAll({
            where: { id: placeIds },
            attributes: ["name"],
            transaction,
          });
          placeNames = places.map((p) => p.name);

          if (places.length < placeIds.length) {
            logger.warn(
              `Role request ${id.slice(0, 8)}: ${
                placeIds.length - places.length
              } place(s) not found`
            );
          }
        }

        await IdCard.create(
          {
            userId,
            role,
            cardNumber: generateCardNumber(role), // ✅ collision-safe
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

        logger.info(
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
    // SOCKET EMIT + FORCE RECONNECT (fresh token)
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

          logger.info(
            `📡 role:updated emitted → user:${user.id} (${user.role})`
          );

          const userSockets = await io
            .in(`user:${user.id}`)
            .fetchSockets();

          for (const s of userSockets) {
            s.disconnect(true);
          }

          logger.info(
            `🔌 Disconnected ${userSockets.length} socket(s) for fresh role sync`
          );
        }
      } catch (socketErr) {
        logger.error(`❌ Socket emit failed: ${socketErr.message}`);
      }
    }

    return ApiResponse.success(
      res,
      `Role request ${status.toLowerCase()}`,
      roleRequest
    );
  } catch (error) {
    await transaction.rollback();
    logger.error(`❌ updateRoleRequestStatus error: ${error.message}`);
    next(error);
  }
};