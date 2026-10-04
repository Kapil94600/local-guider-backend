// src/modules/devices/device.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getUserDevices,
} from "./device.service.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/devices/register-token
// Body: { token, deviceName?, deviceType?, os?, appVersion? }
// ═══════════════════════════════════════════════════════════════
export const registerToken = async (req, res, next) => {
  try {
    const { token, deviceName, deviceType, os, appVersion } = req.body;
    const userId = req.user.id;

    logger.info(
      `📥 [Device] Register token request — user: ${userId.slice(0, 8)}, token length: ${token?.length || 0}`
    );

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const device = await registerDeviceToken(userId, token, {
      deviceName,
      deviceType,
      os,
      appVersion,
    });

    return ApiResponse.success(res, "Token registered successfully", {
      id: device.id,
      tokenLength: device.fcmToken.length,  // ← Debug info
      lastActiveAt: device.lastActiveAt,
    });
  } catch (error) {
    logger.error(`❌ [Device] Register token error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/devices/unregister-token
// Body: { token }
// ═══════════════════════════════════════════════════════════════
export const unregisterToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const result = await unregisterDeviceToken(userId, token);

    return ApiResponse.success(res, "Token unregistered", result);
  } catch (error) {
    logger.error(`❌ [Device] Unregister token error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/devices
// ═══════════════════════════════════════════════════════════════
export const getMyDevices = async (req, res, next) => {
  try {
    const devices = await getUserDevices(req.user.id);
    return ApiResponse.success(res, "Devices fetched", devices);
  } catch (error) {
    logger.error(`❌ [Device] Get devices error: ${error.message}`);
    next(error);
  }
};