// src/modules/notifications/notification.service.js
import {
  createNotification,
  getNotificationsByUser,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
} from "./notification.repository.js";
import User from "../../database/models/core/User.js";
import { sendEmail } from "../../utils/emailService.js";
import { sendSms } from "../../utils/smsService.js";
import { sendPushNotification } from "./push.service.js";
import { getEmailTemplate } from "../../utils/emailTemplates.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// Determine primary channel
// ═══════════════════════════════════════════════════════════════
const determinePrimaryChannel = (channels = []) => {
  if (channels.includes("IN_APP")) return "IN_APP";
  if (channels.includes("PUSH")) return "PUSH";
  if (channels.includes("EMAIL")) return "EMAIL";
  if (channels.includes("SMS")) return "SMS";
  return "IN_APP";
};

// ═══════════════════════════════════════════════════════════════
// ADD NOTIFICATION
// ═══════════════════════════════════════════════════════════════
export const addNotification = async ({
  userId,
  title,
  message,
  type = "SYSTEM",
  data = {},
  channels = ["IN_APP", "PUSH"],
  email = null,
  phone = null,
}) => {
  try {
    const primaryChannel = determinePrimaryChannel(channels);

    // ── 1. Save to DB ──
    const notification = await createNotification({
      userId,
      title,
      message,
      type,
      data,
      isRead: false,
      channel: primaryChannel,
      sentAt: new Date(),
    });

    // ── 2. Push (fire & forget) ──
    if (channels.includes("PUSH")) {
      sendPushNotification(userId, title, message, data, type).catch((err) => {
        logger.error(`Push notification failed: ${err.message}`);
      });
    }

    // ── 3. Email — auto-fetch if not provided ──
    if (channels.includes("EMAIL")) {
      let toEmail = email;
      if (!toEmail) {
        try {
          const u = await User.findByPk(userId, {
            attributes: ["email"],
          });
          toEmail = u?.email;
        } catch (e) {
          logger.error(`User email fetch failed: ${e.message}`);
        }
      }
      if (toEmail) {
        const html = getEmailTemplate(type, title, message, data);
        sendEmail({ to: toEmail, subject: title, html }).catch((err) => {
          logger.error(`Email failed: ${err.message}`);
        });
      }
    }

    // ── 4. SMS — auto-fetch if not provided ──
    if (channels.includes("SMS")) {
      let toPhone = phone;
      if (!toPhone) {
        try {
          const u = await User.findByPk(userId, {
            attributes: ["phone"],
          });
          toPhone = u?.phone;
        } catch (e) {
          logger.error(`User phone fetch failed: ${e.message}`);
        }
      }
      if (toPhone) {
        sendSms({ to: toPhone, body: message }).catch((err) => {
          logger.error(`SMS failed: ${err.message}`);
        });
      }
    }

    return notification;
  } catch (error) {
    logger.error(`addNotification ERROR: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════
export const fetchMyNotifications = async (userId, params = {}) => {
  return await getNotificationsByUser(userId, params);
};

export const readNotification = async (id, userId) => {
  const [updated] = await markNotificationRead(id, userId);
  if (updated === 0) throw new Error("Notification not found");
  return await getNotificationById(id);
};

export const readAllNotifications = async (userId) => {
  await markAllNotificationsRead(userId);
  return { message: "All notifications marked as read" };
};

export const removeNotification = async (id, userId) => {
  const deleted = await deleteNotification(id, userId);
  if (deleted === 0) throw new Error("Notification not found");
  return { message: "Notification deleted" };
};

export const removeAllNotifications = async (userId) => {
  await deleteAllNotifications(userId);
  return { message: "All notifications deleted" };
};

export const fetchUnreadCount = async (userId) => {
  return await getUnreadCount(userId);
};