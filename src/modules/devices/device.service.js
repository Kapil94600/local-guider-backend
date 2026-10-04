// src/modules/devices/device.service.js
import { Op } from "sequelize";
import Device from "../../database/models/core/Device.js";
import { ApiError } from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// REGISTER / UPDATE DEVICE TOKEN
// ✅ Ek token = ek hi user (phone se naya login -> purana owner hatao)
// ═══════════════════════════════════════════════════════════════
export const registerDeviceToken = async (userId, token, metadata = {}) => {
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "Token is required");
  }

  const cleanToken = token.trim();
  const shortUser = String(userId).slice(0, 8);

  console.log(
    `📱 [Device] REGISTER — user: ${shortUser}, length: ${cleanToken.length}, token: ${cleanToken}`
  );

  // Expo token hamesha "ExponentPushToken[...]" ya "ExpoPushToken[...]" hota hai
  if (!/^Expo(nent)?PushToken\[.+\]$/.test(cleanToken)) {
    throw new ApiError(400, "Invalid Expo push token format");
  }

  try {
    // ✅ Same token kisi aur user ke naam par ho to hata do
    const removed = await Device.destroy({
      where: { fcmToken: cleanToken, userId: { [Op.ne]: userId } },
    });
    if (removed > 0) {
      console.log(
        `🧹 [Device] Token ${removed} dusre user(s) se hata diya (phone ka owner badla)`
      );
    }

    const [device, created] = await Device.findOrCreate({
      where: { userId, fcmToken: cleanToken },
      defaults: {
        userId,
        fcmToken: cleanToken,
        deviceName: metadata.deviceName || null,
        deviceType: metadata.deviceType || null,
        os: metadata.os || null,
        appVersion: metadata.appVersion || null,
        lastActiveAt: new Date(),
      },
    });

    if (!created) {
      await device.update({
        lastActiveAt: new Date(),
        deviceName: metadata.deviceName || device.deviceName,
        deviceType: metadata.deviceType || device.deviceType,
        os: metadata.os || device.os,
        appVersion: metadata.appVersion || device.appVersion,
      });
      logger.info(`📱 [Device] Existing token updated for ${shortUser}`);
    } else {
      logger.info(`📱 [Device] New token registered for ${shortUser}`);
    }

    return device;
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
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
// UNREGISTER TOKEN
// ═══════════════════════════════════════════════════════════════
export const unregisterDeviceToken = async (userId, token) => {
  if (!token) throw new ApiError(400, "Token is required");

  const deleted = await Device.destroy({
    where: { userId, fcmToken: token.trim() },
  });

  logger.info(
    `📱 [Device] Unregistered ${deleted} token(s) for ${String(userId).slice(0, 8)}`
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
// CLEANUP INVALID TOKENS
// ═══════════════════════════════════════════════════════════════
export const cleanupInvalidTokens = async () => {
  const deleted = await Device.destroy({
    where: { fcmToken: "ExponentPushToken[]" },
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