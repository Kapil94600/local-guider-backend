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
  const notification = await createNotification({
    userId,
    title,
    message,
    type,
    data,
    isRead: false,
    channel: "IN_APP",
    sentAt: new Date(),
  });

  if (channels.includes("PUSH")) {
    sendPushNotification(userId, title, message, data).catch(console.error);
  }

  if (channels.includes("EMAIL") && email) {
    const emailTemplate = getEmailTemplate(type, title, message, data);
    await sendEmail({ to: email, subject: title, html: emailTemplate });
  }

  if (channels.includes("SMS") && phone) {
    await sendSms({ to: phone, body: message });
  }

  return notification;
};

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

const getEmailTemplate = (type, title, message, data) => {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
  let actionUrl = null;
  if (type === "BOOKING" && data.bookingId) {
    actionUrl = `${baseUrl}/bookings/${data.bookingId}`;
  } else if (type === "CHAT" && data.conversationId) {
    actionUrl = `${baseUrl}/chat/${data.conversationId}`;
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
      .container { max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; }
      .header { background: #1e3a6e; padding: 20px; color: #fff; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { padding: 20px; color: #333; }
      .footer { padding: 15px; text-align: center; background: #f4f4f4; color: #888; font-size: 12px; }
      .btn { display: inline-block; padding: 10px 20px; margin-top: 15px; background: #FFD700; color: #1e3a6e; text-decoration: none; border-radius: 5px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>Local Guider</h1></div>
      <div class="content">
        <h2>${title}</h2>
        <p>${message}</p>
        ${actionUrl ? `<a href="${actionUrl}" class="btn">View Details</a>` : ""}
      </div>
      <div class="footer">© 2026 Local Guider. All rights reserved.</div>
    </div>
  </body>
  </html>`;
};