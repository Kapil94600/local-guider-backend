// src/modules/devices/device.service.js
import Device from "../../database/models/core/Device.js";
import { ApiError } from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// REGISTER / UPDATE DEVICE TOKEN
// ✅ FIXED: NO truncation, full logging
// ═══════════════════════════════════════════════════════════════
export const registerDeviceToken = async (userId, token, metadata = {}) => {
  // ─── Validate ───
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "Token is required");
  }

  // ✅ CRITICAL: sirf trim karo, slice/substring MAT karo
  const cleanToken = token.trim();

  // ═══════════════════════════════════════════════════════════
  // ✅ FULL LOGGING — Debug ke liye
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════");
  console.log("📱 [Device] REGISTER TOKEN REQUEST");
  console.log("   User ID       :", userId);
  console.log("   Token         :", cleanToken);
  console.log("   Token Length  :", cleanToken.length);
  console.log("   Token Starts  :", cleanToken.substring(0, 30));
  console.log("   Token Ends    :", cleanToken.slice(-30));
  console.log("   Metadata      :", JSON.stringify(metadata));
  console.log("═══════════════════════════════════════════════════");

  // ─── Warning: chhota token ───
  if (cleanToken.length < 50) {
    console.log(
      `⚠️ [Device] Token SUSPICIOUSLY SHORT: ${cleanToken.length} chars`
    );
    logger.warn(
      `⚠️ [Device] Token short: ${cleanToken.length} chars — ${cleanToken}`
    );
  }

  // ─── Warning: truncated token ───
  if (cleanToken.endsWith("]") && cleanToken.includes("ExponentPushToken[")) {
    const innerLength = cleanToken.length - "ExponentPushToken[]".length;
    console.log(
      `⚠️ [Device] Token TRUNCATED? Inner length: ${innerLength} chars (expected ~22)`
    );
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
      await device.update({ lastActiveAt: new Date() });
      console.log(
        `✅ [Device] Existing token updated — user: ${userId.slice(0, 8)}, token length: ${device.fcmToken.length}`
      );
      logger.info(
        `📱 [Device] Existing token updated for ${userId.slice(0, 8)}`
      );
    } else {
      console.log(
        `✅ [Device] NEW token registered — user: ${userId.slice(0, 8)}, token length: ${device.fcmToken.length}`
      );
      logger.info(`📱 [Device] New token registered for ${userId.slice(0, 8)}`);
    }

    // ═══════════════════════════════════════════════════════════
    // ✅ Verify — DB se wapas fetch karo
    // ═══════════════════════════════════════════════════════════
    const savedDevice = await Device.findByPk(device.id);
    console.log("═══════════════════════════════════════════════════");
    console.log("🔍 [Device] VERIFY FROM DB");
    console.log("   Saved Token   :", savedDevice.fcmToken);
    console.log("   Saved Length  :", savedDevice.fcmToken.length);
    console.log("   Match         :", savedDevice.fcmToken === cleanToken);
    console.log("═══════════════════════════════════════════════════");

    return savedDevice;
  } catch (err) {
    // Handle unique constraint
    if (err.name === "SequelizeUniqueConstraintError") {
      logger.info(`📱 [Device] Token exists for user ${userId.slice(0, 8)}`);
      const existing = await Device.findOne({
        where: { userId, fcmToken: cleanToken },
      });
      if (existing) {
        await existing.update({ lastActiveAt: new Date() });
        return existing;
      }
    }
    console.error("❌ [Device] Register error:", err.message);
    throw err;
  }
};

// ═══════════════════════════════════════════════════════════════
// UNREGISTER TOKEN (logout ke waqt)
// ═══════════════════════════════════════════════════════════════
export const unregisterDeviceToken = async (userId, token) => {
  if (!token) throw new ApiError(400, "Token is required");

  console.log(
    `🔓 [Device] Unregistering token for user ${userId.slice(0, 8)} — length: ${token.length}`
  );

  const deleted = await Device.destroy({
    where: { userId, fcmToken: token },
  });

  logger.info(
    `📱 [Device] Unregistered ${deleted} token(s) for ${userId.slice(0, 8)}`
  );
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
// CLEANUP INVALID / TRUNCATED TOKENS (admin utility)
// ═══════════════════════════════════════════════════════════════
export const cleanupInvalidTokens = async () => {
  const { Op } = await import("sequelize");

  // Delete tokens that are truncated or invalid
  const deleted = await Device.destroy({
    where: {
      [Op.or]: [
        { fcmToken: "ExponentPushToken[]" }, // Empty tokens
      ],
    },
  });

  logger.info(`🧹 [Device] Cleaned ${deleted} invalid tokens`);
  return { deleted };
};

export default {
  registerDeviceToken,
  unregisterDeviceToken,
  getUserDevices,
  cleanupInvalidTokens,
};