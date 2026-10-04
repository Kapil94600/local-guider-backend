// src/modules/devices/device.service.js
import Device from "../../database/models/core/Device.js";
import { ApiError } from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// REGISTER / UPDATE DEVICE TOKEN
// ═══════════════════════════════════════════════════════════════
export const registerDeviceToken = async (userId, token, metadata = {}) => {
  // ─── Validate ───
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "Token is required");
  }

  // ⚠️ CRITICAL: Token TRUNCATE bilkul nahi karna
  const cleanToken = token.trim(); // ← sirf whitespace hatao, slice MAT karo

  // ✅ Token length log karo (debug ke liye)
  logger.info(
    `📱 [Device] Registering token for user ${userId.slice(0, 8)} — length: ${cleanToken.length} chars`
  );

  // ⚠️ Warning agar token chhota hai
  if (cleanToken.length < 50) {
    logger.warn(
      `⚠️ [Device] Token suspiciously short: ${cleanToken.length} chars — ${cleanToken}`
    );
  }

  // ⚠️ Warning agar token `]` ke baad kuch nahi (truncated)
  if (cleanToken.endsWith("]") && !cleanToken.includes("]")) {
    logger.warn(`⚠️ [Device] Token appears truncated: ${cleanToken}`);
  }

  // ─── Upsert (create or update) ───
  try {
    const [device, created] = await Device.findOrCreate({
      where: { userId, fcmToken: cleanToken },
      defaults: {
        userId,
        fcmToken: cleanToken, // ← Full token
        deviceName: metadata.deviceName || null,
        deviceType: metadata.deviceType || null,
        os: metadata.os || null,
        appVersion: metadata.appVersion || null,
        lastActiveAt: new Date(),
      },
    });

    if (!created) {
      // Update lastActiveAt
      await device.update({ lastActiveAt: new Date() });
      logger.info(`📱 [Device] Existing token updated for user ${userId.slice(0, 8)}`);
    } else {
      logger.info(`📱 [Device] New token registered for user ${userId.slice(0, 8)}`);
    }

    return device;
  } catch (err) {
    // Agar unique constraint error hai to existing device update karo
    if (err.name === "SequelizeUniqueConstraintError") {
      logger.info(`📱 [Device] Token already exists for user ${userId.slice(0, 8)}`);
      const existing = await Device.findOne({
        where: { userId, fcmToken: cleanToken },
      });
      if (existing) {
        await existing.update({ lastActiveAt: new Date() });
        return existing;
      }
    }
    throw err;
  }
};

// ═══════════════════════════════════════════════════════════════
// UNREGISTER TOKEN (logout ke waqt)
// ═══════════════════════════════════════════════════════════════
export const unregisterDeviceToken = async (userId, token) => {
  if (!token) throw new ApiError(400, "Token is required");

  const deleted = await Device.destroy({
    where: { userId, fcmToken: token },
  });

  logger.info(`📱 [Device] Unregistered ${deleted} token(s) for user ${userId.slice(0, 8)}`);
  return { deleted };
};

// ═══════════════════════════════════════════════════════════════
// GET ALL DEVICES FOR USER
// ═══════════════════════════════════════════════════════════════
export const getUserDevices = async (userId) => {
  return await Device.findAll({
    where: { userId },
    order: [["lastActiveAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// CLEANUP INVALID TOKENS (admin utility)
// ═══════════════════════════════════════════════════════════════
export const cleanupInvalidTokens = async () => {
  const { Op } = await import("sequelize");
  const deleted = await Device.destroy({
    where: {
      [Op.or]: [
        { fcmToken: { [Op.like]: "%]" } },           // Truncated tokens ending with ]
        { fcmToken: { [Op.like]: "ExponentPushToken[]" } }, // Empty tokens
      ],
    },
  });
  logger.info(`🧹 [Device] Cleaned up ${deleted} invalid tokens`);
  return { deleted };
};

export default {
  registerDeviceToken,
  unregisterDeviceToken,
  getUserDevices,
  cleanupInvalidTokens,
};