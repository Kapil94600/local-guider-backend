// src/modules/notifications/push.service.js
// ═══════════════════════════════════════════════════════════════
// PUSH SERVICE — Expo Push API with badge + grouping + cleanup
// ═══════════════════════════════════════════════════════════════
import { Expo } from "expo-server-sdk";
import Device from "../../database/models/core/Device.js";
import Notification from "../../database/models/core/Notification.js";
import { logger } from "../../utils/logger.js";

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Get unread count for badge
// ═══════════════════════════════════════════════════════════════
const getUnreadCountForBadge = async (userId) => {
  try {
    return await Notification.count({
      where: { userId, isRead: false },
    });
  } catch {
    return 0;
  }
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Grouping metadata (collapseId + threadId)
// ═══════════════════════════════════════════════════════════════
const getGroupingMeta = (type, data = {}) => {
  const meta = {};

  if (type === "CHAT" && data.conversationId) {
    meta.collapseId = `chat:${data.conversationId}`;
    meta.threadId = `chat:${data.conversationId}`;
  } else if (type === "BOOKING" && data.bookingId) {
    meta.collapseId = `booking:${data.bookingId}`;
    meta.threadId = `booking:${data.bookingId}`;
  } else if (type === "PAYMENT" && data.bookingId) {
    meta.collapseId = `payment:${data.bookingId}`;
    meta.threadId = `payment:${data.bookingId}`;
  } else if (type === "WITHDRAWAL" && data.withdrawalId) {
    meta.collapseId = `withdrawal:${data.withdrawalId}`;
  } else if (type === "ROLE_REQUEST") {
    meta.collapseId = "role_request";
  }

  return meta;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Resolve channel per type
// ═══════════════════════════════════════════════════════════════
const getChannelIdForType = (type) => {
  switch (type) {
    case "CHAT":
      return "chat";
    case "BOOKING":
      return "bookings";
    case "PAYMENT":
      return "default";
    case "SYSTEM":
    default:
      return "default";
  }
};

// ═══════════════════════════════════════════════════════════════
// SEND PUSH NOTIFICATION
// ═══════════════════════════════════════════════════════════════
export const sendPushNotification = async (
  userId,
  title,
  body,
  data = {},
  type = "SYSTEM"
) => {
  try {
    // 1. Fetch all devices for user
    const devices = await Device.findAll({ where: { userId } });

    if (devices.length === 0) {
      return { success: true, skipped: true, reason: "no-devices" };
    }

    // 2. Get unread count (for badge)
    const unreadCount = await getUnreadCountForBadge(userId);

    // 3. Grouping metadata
    const grouping = getGroupingMeta(type, data);

    // 4. Channel ID per type
    const channelId = getChannelIdForType(type);

    const messages = [];
    const deviceMap = new Map();

    for (const device of devices) {
      const token = device.fcmToken;

      if (!token) {
        continue;
      }

      if (!Expo.isExpoPushToken(token)) {
        logger.warn(`Invalid Expo token for device ${device.id}`);
        continue;
      }

      const message = {
        to: token,
        sound: "default",
        title,
        body,
        data: { ...data, type },
        priority: "high",
        channelId,
        badge: unreadCount,
        _displayInForeground: true,
        ...(grouping.collapseId && { collapseId: grouping.collapseId }),
        ...(grouping.threadId && { threadId: grouping.threadId }),
      };

      messages.push(message);
      deviceMap.set(token, device.id);
    }

    if (messages.length === 0) {
      return { success: true, skipped: true, reason: "no-valid-tokens" };
    }

    // 5. Send in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const invalidTokens = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        // Check each ticket for errors
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const msg = chunk[i];

          if (ticket.status === "error") {
            const errorCode = ticket.details?.error;
            logger.warn(
              `Push ticket error: ${errorCode} — ${ticket.message}`
            );

            if (errorCode === "DeviceNotRegistered") {
              invalidTokens.push(msg.to);
            }
          }
        }
      } catch (error) {
        logger.error(`Chunk send error: ${error.message}`);
      }
    }

    // 6. Cleanup invalid tokens
    if (invalidTokens.length > 0) {
      try {
        await Device.destroy({ where: { fcmToken: invalidTokens } });
        logger.info(`🗑️ Cleaned ${invalidTokens.length} invalid tokens`);
      } catch (cleanupError) {
        logger.error(`Token cleanup failed: ${cleanupError.message}`);
      }
    }

    return { success: true, tickets, count: messages.length };
  } catch (error) {
    logger.error(`❌ Push notification error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════
// SEND PUSH TO MULTIPLE USERS
// ═══════════════════════════════════════════════════════════════
export const sendPushToMany = async (
  userIds,
  title,
  body,
  data = {},
  type = "SYSTEM"
) => {
  try {
    const devices = await Device.findAll({
      where: { userId: userIds },
    });

    const messages = [];
    const channelId = getChannelIdForType(type);

    for (const device of devices) {
      const token = device.fcmToken;
      if (!token || !Expo.isExpoPushToken(token)) continue;

      messages.push({
        to: token,
        sound: "default",
        title,
        body,
        data: { ...data, type },
        priority: "high",
        channelId,
      });
    }

    if (messages.length === 0) {
      return { success: true, skipped: true };
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const invalidTokens = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          if (
            ticket.status === "error" &&
            ticket.details?.error === "DeviceNotRegistered"
          ) {
            invalidTokens.push(chunk[i].to);
          }
        }
      } catch (err) {
        logger.error(`Bulk chunk error: ${err.message}`);
      }
    }

    if (invalidTokens.length > 0) {
      await Device.destroy({ where: { fcmToken: invalidTokens } });
    }

    return { success: true, tickets, count: messages.length };
  } catch (error) {
    logger.error(`❌ sendPushToMany error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export default { sendPushNotification, sendPushToMany };