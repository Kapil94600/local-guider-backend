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
// ═══════════════════════════════════════════════════════════════
export const registerToken = async (req, res, next) => {
  try {
    const { token, deviceName, deviceType, os, appVersion } = req.body;
    const userId = req.user.id;

    // ═══════════════════════════════════════════════════════════
    // ✅ FULL LOGGING
    // ═══════════════════════════════════════════════════════════
    console.log("═══════════════════════════════════════════════════");
    console.log("📥 [Device Controller] REGISTER TOKEN REQUEST");
    console.log("   User ID     :", userId);
    console.log("   Token       :", token);
    console.log("   Token Length:", token?.length || 0);
    console.log("   Full Body   :", JSON.stringify(req.body));
    console.log("═══════════════════════════════════════════════════");

    logger.info(
      `📥 [Device] Register — user: ${userId.slice(0, 8)}, token length: ${token?.length || 0}`
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

    const response = {
      id: device.id,
      tokenLength: device.fcmToken.length,
      tokenPreview: device.fcmToken.substring(0, 30) + "...",
      tokenEndsWith: device.fcmToken.slice(-20),
      lastActiveAt: device.lastActiveAt,
    };

    console.log("═══════════════════════════════════════════════════");
    console.log("📤 [Device Controller] REGISTER SUCCESS");
    console.log("   Response:", JSON.stringify(response, null, 2));
    console.log("═══════════════════════════════════════════════════");

    return ApiResponse.success(res, "Token registered successfully", response);
  } catch (error) {
    console.error("❌ [Device Controller] Register error:", error.message);
    logger.error(`❌ [Device] Register error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/devices/unregister-token
// ═══════════════════════════════════════════════════════════════
export const unregisterToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    console.log(
      `📥 [Device Controller] Unregister — user: ${userId.slice(0, 8)}, token length: ${token?.length || 0}`
    );

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const result = await unregisterDeviceToken(userId, token);
    return ApiResponse.success(res, "Token unregistered", result);
  } catch (error) {
    logger.error(`❌ [Device] Unregister error: ${error.message}`);
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