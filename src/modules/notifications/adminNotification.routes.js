// src/modules/notifications/adminNotification.routes.js
import express from "express";
import {
  sendBroadcast,
  getAllNotifications,
} from "./adminNotification.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ✅ Admin only — router-level middleware
// ═══════════════════════════════════════════════════════════════
router.use(authenticate, authorize("ADMIN"));

// GET /api/v1/admin/notifications
router.get("/", getAllNotifications);

// POST /api/v1/admin/notifications/send
router.post("/send", sendBroadcast);

export default router;