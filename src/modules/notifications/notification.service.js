// src/modules/notifications/notification.service.js
import {
  createNotification,
  getNotificationsByUser,
  getNotificationById,
  getNotificationWithDetails,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
} from "./notification.repository.js";
import { sendPushNotification } from "./push.service.js";
import { ApiError } from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// ✅ ADD NOTIFICATION (ye function booking.service.js use karti hai)
// ═══════════════════════════════════════════════════════════════
export const addNotification = async ({
  userId,
  title,
  message,
  type = "SYSTEM",
  data = {},
  channels = ["IN_APP"],
}) => {
  try {
    let notification = null;

    // ─── IN_APP channel: DB me save karo ───
    if (channels.includes("IN_APP")) {
      notification = await createNotification({
        userId,
        title,
        message,
        type,
        data,
        isRead: false,
        channel: "IN_APP",
        sentAt: new Date(),
      });
    }

    // ─── PUSH channel: Expo push bhejo ───
    if (channels.includes("PUSH")) {
      try {
        await sendPushNotification(userId, title, message, data, type);
      } catch (pushErr) {
        logger.error(`Push failed for user ${userId}: ${pushErr.message}`);
      }
    }

    return notification;
  } catch (err) {
    logger.error(`addNotification failed: ${err.message}`);
    throw err;
  }
};

// ═══════════════════════════════════════════════════════════════
// FETCH MY NOTIFICATIONS (paginated)
// ═══════════════════════════════════════════════════════════════
export const fetchMyNotifications = async (userId, { page, limit } = {}) => {
  const { rows, count } = await getNotificationsByUser(userId, { page, limit });

  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);

  return {
    items: rows,
    pagination: {
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    },
  };
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: FETCH ONE NOTIFICATION with full booking details
// ═══════════════════════════════════════════════════════════════
export const fetchNotificationDetail = async (id, userId) => {
  const notification = await getNotificationWithDetails(id, userId);
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  return notification;
};

// ═══════════════════════════════════════════════════════════════
// MARK AS READ
// ═══════════════════════════════════════════════════════════════
export const readNotification = async (id, userId) => {
  const notification = await getNotificationById(id);
  if (!notification) throw new ApiError(404, "Notification not found");
  if (notification.userId !== userId) {
    throw new ApiError(403, "Not allowed");
  }

  await markNotificationRead(id, userId);
  return await getNotificationById(id);
};

// ═══════════════════════════════════════════════════════════════
// MARK ALL AS READ
// ═══════════════════════════════════════════════════════════════
export const readAllNotifications = async (userId) => {
  const [updated] = await markAllNotificationsRead(userId);
  return {
    message: `${updated} notification(s) marked as read`,
    count: updated,
  };
};

// ═══════════════════════════════════════════════════════════════
// DELETE ONE
// ═══════════════════════════════════════════════════════════════
export const removeNotification = async (id, userId) => {
  const notification = await getNotificationById(id);
  if (!notification) throw new ApiError(404, "Notification not found");
  if (notification.userId !== userId) {
    throw new ApiError(403, "Not allowed");
  }

  await deleteNotification(id, userId);
  return { message: "Notification deleted" };
};

// ═══════════════════════════════════════════════════════════════
// DELETE ALL
// ═══════════════════════════════════════════════════════════════
export const removeAllNotifications = async (userId) => {
  const count = await deleteAllNotifications(userId);
  return { message: `${count} notification(s) deleted`, count };
};

// ═══════════════════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════════════════
export const fetchUnreadCount = async (userId) => {
  return await getUnreadCount(userId);
};