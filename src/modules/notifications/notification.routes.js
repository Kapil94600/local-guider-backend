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

router.use(authenticate);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCountController);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteMyNotification);
router.delete("/", deleteAllMyNotifications);

export default router;