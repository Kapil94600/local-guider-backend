// src/modules/notifications/notification.routes.js
import express from "express";
import {
  getMyNotifications,
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
// GET /notifications — list (with pagination)
// ═══════════════════════════════════════════════════════════════
router.get("/", getMyNotifications);

// ═══════════════════════════════════════════════════════════════
// GET /notifications/unread-count
// ═══════════════════════════════════════════════════════════════
router.get("/unread-count", getUnreadCountController);

// ═══════════════════════════════════════════════════════════════
// PUT /notifications/read-all — mark all read
// ═══════════════════════════════════════════════════════════════
router.put("/read-all", markAllAsRead);

// ═══════════════════════════════════════════════════════════════
// PUT /notifications/:id/read — mark single read
// ═══════════════════════════════════════════════════════════════
router.put("/:id/read", markAsRead);

// ═══════════════════════════════════════════════════════════════
// DELETE /notifications — delete all
// ═══════════════════════════════════════════════════════════════
router.delete("/", deleteAllMyNotifications);

// ═══════════════════════════════════════════════════════════════
// DELETE /notifications/:id — delete single
// ═══════════════════════════════════════════════════════════════
router.delete("/:id", deleteMyNotification);

export default router;