// src/modules/notifications/push.service.js
// ═══════════════════════════════════════════════════════════════
// PUSH SERVICE — Expo Push API with debug logs
// ═══════════════════════════════════════════════════════════════
import { Expo } from "expo-server-sdk";
import Device from "../../database/models/core/Device.js";
import { logger } from "../../utils/logger.js";

const expo = new Expo();

// ═══════════════════════════════════════════════════════════════
// SEND PUSH NOTIFICATION
// ═══════════════════════════════════════════════════════════════
export const sendPushNotification = async (
  userId,
  title,
  body,
  data = {}
) => {
  try {
    console.log("🔔 sendPushNotification CALLED");
    console.log("   → userId:", userId);
    console.log("   → title:", title);

    // ✅ 1. Fetch all devices for user
    const devices = await Device.findAll({ where: { userId } });
    console.log("🔍 Devices found:", devices.length);

    if (devices.length === 0) {
      console.log("⚠️ No devices registered for user");
      return { success: true, skipped: true, reason: "no-devices" };
    }

    const messages = [];
    const deviceMap = new Map();

    for (const device of devices) {
      const token = device.fcmToken;
      console.log("🔍 Device token:", token ? token.slice(0, 40) : "NULL");

      if (!token) {
        console.log("   ❌ Empty token, skipping");
        continue;
      }

      if (!Expo.isExpoPushToken(token)) {
        console.log("   ❌ Invalid Expo token format, skipping");
        continue;
      }

      messages.push({
        to: token,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
        channelId: "default",
        // ✅ Android specific
        _displayInForeground: true,
      });
      deviceMap.set(token, device.id);
    }

    console.log("✅ Valid messages to send:", messages.length);

    if (messages.length === 0) {
      console.log("⚠️ No valid tokens — skipping push");
      return { success: true, skipped: true, reason: "no-valid-tokens" };
    }

    // ✅ 2. Send in chunks
    const chunks = expo.chunkPushNotifications(messages);
    console.log("📤 Sending in", chunks.length, "chunks");

    const tickets = [];
    const invalidTokens = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        console.log("📬 Tickets received:", ticketChunk.length);

        // ─── Check each ticket ───
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const msg = chunk[i];

          if (ticket.status === "error") {
            const errorCode = ticket.details?.error;
            console.log(
              `❌ Ticket error: ${errorCode} — ${ticket.message}`
            );

            if (errorCode === "DeviceNotRegistered") {
              invalidTokens.push(msg.to);
            }
          } else {
            console.log(`✅ Ticket OK — id: ${ticket.id}`);
          }
        }
      } catch (error) {
        console.error("❌ Chunk send error:", error.message);
      }
    }

    // ✅ 3. Cleanup invalid tokens
    if (invalidTokens.length > 0) {
      try {
        await Device.destroy({ where: { fcmToken: invalidTokens } });
        console.log(`🗑️ Cleaned ${invalidTokens.length} invalid tokens`);
      } catch (cleanupError) {
        console.error("Token cleanup failed:", cleanupError.message);
      }
    }

    console.log("✅ Push complete. Total tickets:", tickets.length);
    return { success: true, tickets, count: messages.length };
  } catch (error) {
    console.error("❌ Push notification error:", error);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════
// SEND PUSH TO MULTIPLE USERS
// ═══════════════════════════════════════════════════════════════
export const sendPushToMany = async (userIds, title, body, data = {}) => {
  try {
    console.log("🔔 sendPushToMany CALLED for", userIds.length, "users");

    const devices = await Device.findAll({
      where: { userId: userIds },
    });

    console.log("🔍 Total devices found:", devices.length);

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
        channelId: "default",
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
        console.error("Chunk error:", err.message);
      }
    }

    if (invalidTokens.length > 0) {
      await Device.destroy({ where: { fcmToken: invalidTokens } });
    }

    console.log("✅ Bulk push sent:", messages.length);
    return { success: true, tickets, count: messages.length };
  } catch (error) {
    console.error("❌ sendPushToMany error:", error);
    return { success: false, error: error.message };
  }
};

export default { sendPushNotification, sendPushToMany };