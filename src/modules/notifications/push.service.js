// src/modules/notifications/push.service.js
import { Expo } from "expo-server-sdk";
import Device from "../../database/models/core/Device.js";

const expo = new Expo();

// ═══════════════════════════════════════════════════════════════
// SEND PUSH NOTIFICATION
// ═══════════════════════════════════════════════════════════════
export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const devices = await Device.findAll({ where: { userId } });
    const messages = [];
    const deviceMap = new Map();

    for (const device of devices) {
      const token = device.fcmToken;
      if (!token || !Expo.isExpoPushToken(token)) continue;

      messages.push({
        to: token,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
        channelId: "default",
      });
      deviceMap.set(token, device.id);
    }

    if (messages.length === 0) {
      return { success: true, skipped: true };
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const invalidTokens = [];

    // ─── Send chunks ───
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        // ─── Check each ticket for errors ───
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const msg = chunk[i];

          if (ticket.status === "error") {
            const errorCode = ticket.details?.error;

            if (errorCode === "DeviceNotRegistered") {
              invalidTokens.push(msg.to);
              console.log(
                `🗑️ Invalid token detected: ${msg.to.slice(0, 20)}...`
              );
            } else {
              console.warn(
                `⚠️ Push error for ${msg.to.slice(0, 20)}...:`,
                ticket.message
              );
            }
          }
        }
      } catch (error) {
        console.error("Push send chunk error:", error.message);
      }
    }

    // ─── Cleanup invalid tokens ───
    if (invalidTokens.length > 0) {
      try {
        await Device.destroy({ where: { fcmToken: invalidTokens } });
        console.log(`✅ Cleaned up ${invalidTokens.length} invalid tokens`);
      } catch (cleanupError) {
        console.error("Token cleanup failed:", cleanupError.message);
      }
    }

    return { success: true, tickets };
  } catch (error) {
    console.error("Push notification error:", error.message);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════
// SEND PUSH TO MULTIPLE USERS (bulk)
// ═══════════════════════════════════════════════════════════════
export const sendPushToMany = async (userIds, title, body, data = {}) => {
  try {
    const devices = await Device.findAll({
      where: { userId: userIds },
    });

    const messages = [];
    for (const device of devices) {
      const token = device.fcmToken;
      if (!token || !Expo.isExpoPushToken(token)) continue;

      messages.push({
        to: token,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
      });
    }

    if (messages.length === 0) return { success: true, skipped: true };

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const invalidTokens = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
            invalidTokens.push(chunk[i].to);
          }
        }
      } catch (err) {
        console.error("Push bulk chunk error:", err.message);
      }
    }

    if (invalidTokens.length > 0) {
      await Device.destroy({ where: { fcmToken: invalidTokens } });
    }

    return { success: true, tickets, count: messages.length };
  } catch (error) {
    console.error("sendPushToMany error:", error.message);
    return { success: false, error: error.message };
  }
};

export default { sendPushNotification, sendPushToMany };