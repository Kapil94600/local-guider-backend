// src/modules/devices/device.routes.js
import express from 'express';
import { authenticate } from '../../middlewares/authMiddleware.js';
import Device from '../../database/models/core/Device.js';

const router = express.Router();

// ✅ Save/update FCM token for logged-in user
router.post('/register-token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    // Upsert device token
    const [device, created] = await Device.findOrCreate({
      where: { userId: req.user.id, fcmToken: token },
      defaults: { userId: req.user.id, fcmToken: token },
    });

    if (!created) {
      await device.update({ fcmToken: token });
    }

    return res.json({ success: true, message: 'Token saved' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;