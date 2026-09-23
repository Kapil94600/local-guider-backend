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
import { sendEmail } from "../../utils/emailService.js";
import { sendSms } from "../../utils/smsService.js";
import { sendPushNotification } from "./push.service.js";
import { getEmailTemplate } from "../../utils/emailTemplates.js";

// ═══════════════════════════════════════════
// Determine primary channel from channels array
// ═══════════════════════════════════════════
const determinePrimaryChannel = (channels = []) => {
  if (channels.includes("IN_APP")) return "IN_APP";
  if (channels.includes("PUSH")) return "PUSH";
  if (channels.includes("EMAIL")) return "EMAIL";
  if (channels.includes("SMS")) return "SMS";
  return "IN_APP";
};

// ═══════════════════════════════════════════════════════════════
// ✅ ADD NOTIFICATION — main entry point
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
  const primaryChannel = determinePrimaryChannel(channels);

  // 1️⃣ Save to DB (IN_APP always)
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

  // 2️⃣ Push (async — fire & forget)
  if (channels.includes("PUSH")) {
    sendPushNotification(userId, title, message, data).catch((err) => {
      console.error("Push notification failed:", err.message);
    });
  }

  // 3️⃣ Email (async — non-fatal)
  if (channels.includes("EMAIL") && email) {
    const emailTemplate = getEmailTemplate(type, title, message, data);
    sendEmail({ to: email, subject: title, html: emailTemplate }).catch(
      (err) => {
        console.error("Email send failed:", err.message);
      }
    );
  }

  // 4️⃣ SMS (async — non-fatal)
  if (channels.includes("SMS") && phone) {
    sendSms({ to: phone, body: message }).catch((err) => {
      console.error("SMS send failed:", err.message);
    });
  }

  return notification;
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
  const notification = await getNotificationById(id);
  return notification;
};

export const readAllNotifications = async (userId) => {
  await markAllNotificationsRead(userId);
  return { message: "All notifications marked as read" };
};

export const removeNotification = async (id, userId) => {
  const deleted = await deleteNotification(id, userId);
  if (deleted === 0) throw new Error("Notification not found");
  return { message: "Notification deleted successfully" };
};

export const removeAllNotifications = async (userId) => {
  await deleteAllNotifications(userId);
  return { message: "All notifications deleted" };
};

export const fetchUnreadCount = async (userId) => {
  return await getUnreadCount(userId);
};