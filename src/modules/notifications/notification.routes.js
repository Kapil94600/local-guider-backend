// src/modules/notifications/notification.routes.js
import express from "express";
import {
  getMyNotifications,
  getNotificationDetailController,
  markAsRead,
  markAllAsRead,
  deleteMyNotification,
  deleteAllMyNotifications,
  getUnreadCountController,
} from "./notification.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// All notification routes require auth
// ═══════════════════════════════════════════════════════════════
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// ⚠️ IMPORTANT: SPECIFIC routes PEHLE, phir :id route
// (warna /unread-count bhi :id samajh lega)
// ═══════════════════════════════════════════════════════════════

// GET /notifications — list
router.get("/", getMyNotifications);

// GET /notifications/unread-count
router.get("/unread-count", getUnreadCountController);

// PUT /notifications/read-all — mark all read
router.put("/read-all", markAllAsRead);

// DELETE /notifications — delete all
router.delete("/", deleteAllMyNotifications);

// ═══════════════════════════════════════════════════════════════
// ✅ :id routes LAST me
// ═══════════════════════════════════════════════════════════════

// ✅ NEW: GET /notifications/:id — full detail with booking
router.get("/:id", getNotificationDetailController);

// PUT /notifications/:id/read
router.put("/:id/read", markAsRead);

// DELETE /notifications/:id
router.delete("/:id", deleteMyNotification);

export default router;