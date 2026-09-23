// src/modules/notifications/adminNotification.service.js
import Notification from "../../database/models/core/Notification.js";
import User from "../../database/models/core/User.js";
import { sendPushNotification } from "./push.service.js";
import { sendEmail } from "../../utils/emailService.js";
import { getBroadcastEmailTemplate } from "../../utils/emailTemplates.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-7: CHUNK SIZE for bulk operations
// ═══════════════════════════════════════════════════════════════
const CHUNK_SIZE = 50;

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
// ✅ FIX B-7: Send in chunks with allSettled
// ═══════════════════════════════════════════════════════════════
const sendInChunks = async (items, sendFn) => {
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    await Promise.allSettled(chunk.map(sendFn));
  }
};

// ═══════════════════════════════════════════════════════════════
// BROADCAST NOTIFICATION
// ═══════════════════════════════════════════════════════════════
export const broadcastNotification = async ({
  title,
  message,
  type = "SYSTEM",
  targetRole = "ALL",
  channels = ["PUSH", "EMAIL"],
}) => {
  // Build user filter
  let where = {};
  if (targetRole && targetRole !== "ALL") where.role = targetRole;

  const users = await User.findAll({
    where,
    attributes: ["id", "email", "role"],
  });

  if (users.length === 0) return [];

  const primaryChannel = determinePrimaryChannel(channels);

  // ─── Bulk insert in-app notifications ───
  const notifications = await Notification.bulkCreate(
    users.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
      data: {},
      isRead: false,
      channel: primaryChannel,
      sentAt: new Date(),
    }))
  );

  logger.info(
    `📢 Broadcast: "${title}" → ${users.length} users (channels: ${channels.join(", ")})`
  );

  // ─── ✅ FIX B-7: Push + Email in CHUNKS (non-blocking) ───
  // Fire-and-forget — but chunked to avoid memory spikes
  (async () => {
    try {
      if (channels.includes("PUSH")) {
        await sendInChunks(users, async (user) => {
          try {
            await sendPushNotification(user.id, title, message, { type });
          } catch (err) {
            logger.error(`Push failed for ${user.id.slice(0, 8)}: ${err.message}`);
          }
        });
      }

      if (channels.includes("EMAIL")) {
        const usersWithEmail = users.filter((u) => u.email);
        const html = getBroadcastEmailTemplate(title, message);

        await sendInChunks(usersWithEmail, async (user) => {
          try {
            await sendEmail({
              to: user.email,
              subject: title,
              html,
            });
          } catch (err) {
            logger.error(`Email failed for ${user.email}: ${err.message}`);
          }
        });
      }

      logger.info(`✅ Broadcast delivery complete for ${users.length} users`);
    } catch (err) {
      logger.error(`Broadcast background delivery failed: ${err.message}`);
    }
  })();

  return notifications;
};

// ═══════════════════════════════════════════════════════════════
// FETCH ALL NOTIFICATIONS (admin list)
// ═══════════════════════════════════════════════════════════════
export const fetchAllNotifications = async ({ page = 1, limit = 10 } = {}) => {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);

  return await Notification.findAndCountAll({
    include: [
      {
        model: User,
        as: "user",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "role",
          "profileImage",
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    distinct: true,
  });
};