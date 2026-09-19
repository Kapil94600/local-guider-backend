// src/middlewares/roleMiddleware.js
import User from "../database/models/core/User.js";
import RoleRequest from "../database/models/core/RoleRequest.js";
import Guider from "../database/models/core/Guider.js";
import Photographer from "../database/models/core/Photographer.js";

const REJECT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const ALLOWED_ROLES = ["GUIDER", "PHOTOGRAPHER"];

export const validateRoleRequest = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ SAFE ACCESS — Express 5 me req.body undefined ho sakta hai
    const requestedRole = req.body?.requestedRole || req.body?.role;

    if (!requestedRole || !ALLOWED_ROLES.includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be GUIDER or PHOTOGRAPHER",
      });
    }

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "role",
        "isActive",
        "accountStatus",
        "phoneVerifiedAt",
        "emailVerifiedAt",
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.isActive || user.accountStatus === "BLOCKED") {
      return res
        .status(403)
        .json({ success: false, message: "Account is blocked or inactive" });
    }

    if (user.role === requestedRole) {
      return res.status(400).json({
        success: false,
        message: `You are already a ${requestedRole}`,
      });
    }

    if (user.role === "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Admins cannot request role change",
      });
    }

    if (user.role !== "USER") {
      return res.status(403).json({
        success: false,
        message: `Your current role (${user.role}) cannot request a role change`,
      });
    }

    const pending = await RoleRequest.findOne({
      where: { userId, status: "PENDING" },
    });
    if (pending) {
      return res.status(409).json({
        success: false,
        message: `You already have a pending ${pending.requestedRole} request`,
      });
    }

    const lastRejected = await RoleRequest.findOne({
      where: { userId, status: "REJECTED" },
      order: [["updatedAt", "DESC"]],
    });
    if (lastRejected) {
      const elapsed = Date.now() - new Date(lastRejected.updatedAt).getTime();
      if (elapsed < REJECT_COOLDOWN_MS) {
        const hoursLeft = Math.ceil(
          (REJECT_COOLDOWN_MS - elapsed) / (60 * 60 * 1000)
        );
        return res.status(429).json({
          success: false,
          message: `Previous request was rejected. Please wait ${hoursLeft} hour(s) before trying again.`,
        });
      }
    }

    const ProfileModel = requestedRole === "GUIDER" ? Guider : Photographer;
    const existingProfile = await ProfileModel.findOne({
      where: { userId: user.id },
    });
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: `You already have a ${requestedRole.toLowerCase()} profile`,
      });
    }

    req.validatedRoleRequest = { user, requestedRole };
    next();
  } catch (error) {
    console.error("❌ validateRoleRequest error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ── Baki 3 middlewares (validateRoleRequestStatus, requireVerifiedKYC, requireCompleteProfile) same rahenge ──
export const validateRoleRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED",
      });
    }

    const request = await RoleRequest.findByPk(req.params.id);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Role request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: `This request has already been ${request.status.toLowerCase()}`,
      });
    }

    req.validatedRoleRequest = { roleRequest: request, status };
    next();
  } catch (error) {
    console.error("❌ validateRoleRequestStatus error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const requireVerifiedKYC = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findByPk(userId, {
      attributes: ["id", "role", "isVerified", "accountStatus"],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!["GUIDER", "PHOTOGRAPHER"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only providers can access this resource",
      });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ success: false, message: "KYC verification required" });
    }

    next();
  } catch (error) {
    console.error("❌ requireVerifiedKYC error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const requireCompleteProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findByPk(userId, {
      attributes: ["id", "firstName", "phone", "email"],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const missing = [];
    if (!user.firstName) missing.push("firstName");
    if (!user.phone) missing.push("phone");
    if (!user.email) missing.push("email");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please complete your profile: missing ${missing.join(", ")}`,
      });
    }

    next();
  } catch (error) {
    console.error("❌ requireCompleteProfile error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  validateRoleRequest,
  validateRoleRequestStatus,
  requireVerifiedKYC,
  requireCompleteProfile,
};