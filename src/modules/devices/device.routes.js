// src/modules/devices/device.routes.js
import express from "express";
import { Op } from "sequelize";
import { authenticate } from "../../middlewares/authMiddleware.js";
import Device from "../../database/models/core/Device.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// REGISTER FCM TOKEN
// POST /api/v1/devices/register-token
// Body: { token, deviceName?, deviceType?, os?, appVersion? }
// ═══════════════════════════════════════════════════════════════
router.post("/register-token", authenticate, async (req, res) => {
  try {
    const { token, deviceName, deviceType, os, appVersion } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token required" });
    }

    // Remove stale token for OTHER users
    await Device.destroy({
      where: {
        fcmToken: token,
        userId: { [Op.ne]: req.user.id },
      },
    });

    // Upsert device token
    const [device, created] = await Device.findOrCreate({
      where: { userId: req.user.id, fcmToken: token },
      defaults: {
        userId: req.user.id,
        fcmToken: token,
        deviceName: deviceName || null,
        deviceType: deviceType || null,
        os: os || null,
        appVersion: appVersion || null,
        lastActiveAt: new Date(),
      },
    });

    if (!created) {
      await device.update({
        deviceName: deviceName || device.deviceName,
        deviceType: deviceType || device.deviceType,
        os: os || device.os,
        appVersion: appVersion || device.appVersion,
        lastActiveAt: new Date(),
      });
    }

    return res.json({ success: true, message: "Token saved" });
  } catch (error) {
    console.error("❌ register-token error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// UNREGISTER FCM TOKEN (logout)
// DELETE /api/v1/devices/unregister-token
// ═══════════════════════════════════════════════════════════════
router.delete("/unregister-token", authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token required" });
    }

    const deleted = await Device.destroy({
      where: { userId: req.user.id, fcmToken: token },
    });

    return res.json({
      success: true,
      message: "Token removed",
      deleted,
    });
  } catch (error) {
    console.error("❌ unregister-token error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
});

export default router;