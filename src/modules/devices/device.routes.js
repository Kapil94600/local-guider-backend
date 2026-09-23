// src/modules/devices/device.routes.js
import express from "express";
import { Op } from "sequelize"; // ✅ FIX: Op import
import { authenticate } from "../../middlewares/authMiddleware.js";
import Device from "../../database/models/core/Device.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// REGISTER FCM TOKEN
// POST /api/v1/devices/register-token
// Body: { token }
// ═══════════════════════════════════════════════════════════════
router.post("/register-token", authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token required" });
    }

    // ✅ Remove stale token for OTHER users (Op.ne)
    await Device.destroy({
      where: {
        fcmToken: token,
        userId: { [Op.ne]: req.user.id }, // ✅ FIXED (was $ne)
      },
    });

    // Upsert device token for THIS user
    const [device, created] = await Device.findOrCreate({
      where: { userId: req.user.id, fcmToken: token },
      defaults: {
        userId: req.user.id,
        fcmToken: token,
        lastActiveAt: new Date(),
      },
    });

    if (!created) {
      await device.update({
        fcmToken: token,
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
// Body: { token }
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