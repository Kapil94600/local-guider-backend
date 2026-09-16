import Notification from "../../database/models/core/Notification.js";
import User from "../../database/models/core/User.js";
import { sendPushNotification } from "./push.service.js";
import { sendEmail } from "../../utils/emailService.js";

// ✅ Broadcast – accept object for flexibility
export const broadcastNotification = async ({ title, message, type = "SYSTEM", targetRole = "ALL", channels = ["PUSH", "EMAIL"] }) => {
  let where = {};
  if (targetRole && targetRole !== "ALL") where.role = targetRole;

  const users = await User.findAll({ where, attributes: ["id", "email", "role"] });
  if (users.length === 0) return [];

  const notifications = await Notification.bulkCreate(
    users.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
      data: {},
      isRead: false,
      channel: "IN_APP",
    }))
  );

  // Push + Email (fire and forget)
  for (const user of users) {
    if (channels.includes("PUSH")) {
      sendPushNotification(user.id, title, message, { type }).catch(console.error);
    }
    if (channels.includes("EMAIL") && user.email) {
      const html = getBroadcastEmailTemplate(title, message);
      sendEmail({ to: user.email, subject: title, html }).catch(console.error);
    }
  }

  return notifications;
};

// ✅ Fetch all notifications with pagination (admin)
export const fetchAllNotifications = async ({ page = 1, limit = 10 } = {}) => {
  return await Notification.findAndCountAll({
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "phone", "role", "profileImage"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
};

// Helper for email template
const getBroadcastEmailTemplate = (title, message) => `
  <!DOCTYPE html>
  <html>
  <head><style>body{font-family:Arial;background:#f4f4f4;padding:20px}.container{max-width:600px;margin:auto;background:#fff;border-radius:8px}.header{background:#1e3a6e;padding:20px;color:#fff}.header h1{margin:0}.content{padding:20px;color:#333}.footer{padding:15px;text-align:center;background:#f4f4f4;color:#888;font-size:12px}</style></head>
  <body><div class="container"><div class="header"><h1>Local Guider</h1></div><div class="content"><h2>${title}</h2><p>${message}</p></div><div class="footer">© 2026 Local Guider</div></div></body></html>`;