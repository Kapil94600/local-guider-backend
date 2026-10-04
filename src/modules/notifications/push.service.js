// src/modules/notifications/push.service.js
// ═══════════════════════════════════════════════════════════════
// PUSH SERVICE — Expo Push API with badge + grouping + cleanup
// ✅ FULL LOGGING for debugging background delivery
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
// SEND PUSH NOTIFICATION (single user)
// ✅ FULL LOGGING + ttl + expiration + android + apns
// ═══════════════════════════════════════════════════════════════
export const sendPushNotification = async (
  userId,
  title,
  body,
  data = {},
  type = "SYSTEM"
) => {
  const shortUserId = userId ? userId.slice(0, 8) : "unknown";

  try {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`📤 [PUSH] START — User: ${shortUserId}`);
    console.log(`   Title : ${title}`);
    console.log(`   Body  : ${body}`);
    console.log(`   Type  : ${type}`);
    console.log(`   Data  : ${JSON.stringify(data)}`);
    console.log(`${"─".repeat(60)}`);

    // ─── Step 1: Fetch devices ───
    const devices = await Device.findAll({ where: { userId } });

    console.log(`📱 [PUSH] Devices found: ${devices.length}`);

    if (devices.length === 0) {
      console.log(`⚠️ [PUSH] No devices registered for user ${shortUserId}`);
      console.log(`   → User ne login kar ke token register nahi kiya`);
      console.log(`${"═".repeat(60)}\n`);
      return { success: true, skipped: true, reason: "no-devices" };
    }

    // ─── Step 2: Log each device ───
    for (const device of devices) {
      const tokenPreview = device.fcmToken
        ? device.fcmToken.slice(0, 45) + "..."
        : "(EMPTY)";
      console.log(`   🔑 Device ${device.id.slice(0, 8)}:`);
      console.log(`      Token: ${tokenPreview}`);
      console.log(`      Last Active: ${device.lastActiveAt || "N/A"}`);
    }

    // ─── Step 3: Get badge count + grouping ───
    const unreadCount = await getUnreadCountForBadge(userId);
    const grouping = getGroupingMeta(type, data);
    const channelId = getChannelIdForType(type);

    console.log(`🔔 [PUSH] Badge count: ${unreadCount}`);
    console.log(`📢 [PUSH] Channel   : ${channelId}`);
    if (grouping.collapseId) {
      console.log(`🔗 [PUSH] collapseId: ${grouping.collapseId}`);
    }

    // ─── Step 4: Build messages ───
    const messages = [];
    const deviceMap = new Map();
    const TTL_SECONDS = 60 * 60; // 1 hour
    const expirationTime = Math.floor(Date.now() / 1000) + TTL_SECONDS;

    for (const device of devices) {
      const token = device.fcmToken;

      if (!token) {
        console.log(`   ⚠️ Skipping device ${device.id.slice(0, 8)} — no token`);
        continue;
      }

      if (!Expo.isExpoPushToken(token)) {
        console.log(`   ❌ Invalid Expo token: ${token.slice(0, 50)}`);
        console.log(`      → Token format galat hai (ExponentPushToken[...] nahi hai)`);
        continue;
      }

      const message = {
        to: token,
        sound: "default",
        title,
        body,
        data: { ...data, type },

        // ✅ CRITICAL: Background delivery
        priority: "high",
        ttl: TTL_SECONDS,
        expiration: expirationTime,

        // ✅ Android specific — lock screen pe bhi dikhe
        channelId,
        android: {
          priority: "high",
          ttl: TTL_SECONDS,
          channelId,
          sound: "default",
          notification: {
            channelId,
            priority: "max",
            defaultSound: true,
            defaultVibrateTimings: true,
            visibility: "public",
          },
        },

        // ✅ iOS specific
        apns: {
          headers: {
            "apns-priority": "10",
            "apns-push-type": "alert",
          },
          payload: {
            aps: {
              sound: "default",
              badge: unreadCount,
              "content-available": 1,
            },
          },
        },

        badge: unreadCount,
        _displayInForeground: true,
        ...(grouping.collapseId && { collapseId: grouping.collapseId }),
        ...(grouping.threadId && { threadId: grouping.threadId }),
      };

      messages.push(message);
      deviceMap.set(token, device.id);
    }

    console.log(`📨 [PUSH] Messages to send: ${messages.length}`);

    if (messages.length === 0) {
      console.log(`⚠️ [PUSH] No valid tokens — nothing to send`);
      console.log(`${"═".repeat(60)}\n`);
      return { success: true, skipped: true, reason: "no-valid-tokens" };
    }

    // ─── Step 5: Send in chunks ───
    const chunks = expo.chunkPushNotifications(messages);
    console.log(`📦 [PUSH] Chunks: ${chunks.length}`);

    const tickets = [];
    const invalidTokens = [];

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      console.log(`\n🚀 [PUSH] Sending chunk ${chunkIdx + 1}/${chunks.length} (${chunk.length} messages)...`);

      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const msg = chunk[i];

          if (ticket.status === "ok") {
            console.log(`   ✅ Ticket ${i}: OK (id: ${ticket.id})`);
          } else if (ticket.status === "error") {
            const errorCode = ticket.details?.error;
            console.log(`   ❌ Ticket ${i}: ERROR`);
            console.log(`      Error code: ${errorCode}`);
            console.log(`      Message   : ${ticket.message}`);
            console.log(`      Token     : ${msg.to.slice(0, 45)}...`);

            if (errorCode === "DeviceNotRegistered") {
              console.log(`      → Ye token invalid hai, delete karna hai`);
              invalidTokens.push(msg.to);
            } else if (errorCode === "MessageTooBig") {
              console.log(`      → Payload bahut bada hai`);
            } else if (errorCode === "MessageRateExceeded") {
              console.log(`      → Rate limit exceed ho gaya`);
            } else if (errorCode === "MismatchSenderId") {
              console.log(`      → FCM sender ID match nahi kar raha (google-services.json issue)`);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Chunk send error: ${error.message}`);
        console.log(`      Stack: ${error.stack}`);
      }
    }

    // ─── Step 6: Cleanup invalid tokens ───
    if (invalidTokens.length > 0) {
      try {
        await Device.destroy({ where: { fcmToken: invalidTokens } });
        console.log(`🗑️ [PUSH] Cleaned ${invalidTokens.length} invalid tokens`);
      } catch (cleanupError) {
        console.log(`❌ [PUSH] Token cleanup failed: ${cleanupError.message}`);
      }
    }

    console.log(`\n✅ [PUSH] COMPLETE — User: ${shortUserId}`);
    console.log(`   Total sent: ${messages.length}`);
    console.log(`   Tickets   : ${tickets.length}`);
    console.log(`   Invalid   : ${invalidTokens.length}`);
    console.log(`${"═".repeat(60)}\n`);

    return { success: true, tickets, count: messages.length };
  } catch (error) {
    console.log(`\n❌ [PUSH] FATAL ERROR`);
    console.log(`   User   : ${shortUserId}`);
    console.log(`   Message: ${error.message}`);
    console.log(`   Stack  : ${error.stack}`);
    console.log(`${"═".repeat(60)}\n`);

    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════
// SEND PUSH TO MULTIPLE USERS
// ✅ FULL LOGGING + ttl + expiration + android + apns
// ═══════════════════════════════════════════════════════════════
export const sendPushToMany = async (
  userIds,
  title,
  body,
  data = {},
  type = "SYSTEM"
) => {
  try {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`📤 [PUSH-MANY] START`);
    console.log(`   Users : ${userIds.length}`);
    console.log(`   Title : ${title}`);
    console.log(`   Type  : ${type}`);
    console.log(`${"─".repeat(60)}`);

    const devices = await Device.findAll({
      where: { userId: userIds },
    });

    console.log(`📱 [PUSH-MANY] Devices found: ${devices.length}`);

    if (devices.length === 0) {
      console.log(`⚠️ [PUSH-MANY] No devices for any user`);
      console.log(`${"═".repeat(60)}\n`);
      return { success: true, skipped: true, reason: "no-devices" };
    }

    const messages = [];
    const channelId = getChannelIdForType(type);
    const TTL_SECONDS = 60 * 60;
    const expirationTime = Math.floor(Date.now() / 1000) + TTL_SECONDS;

    let skippedInvalid = 0;

    for (const device of devices) {
      const token = device.fcmToken;
      if (!token) {
        skippedInvalid++;
        continue;
      }
      if (!Expo.isExpoPushToken(token)) {
        console.log(`   ❌ Invalid token for device ${device.id.slice(0, 8)}: ${token.slice(0, 40)}...`);
        skippedInvalid++;
        continue;
      }

      messages.push({
        to: token,
        sound: "default",
        title,
        body,
        data: { ...data, type },
        priority: "high",
        ttl: TTL_SECONDS,
        expiration: expirationTime,
        channelId,
        android: {
          priority: "high",
          ttl: TTL_SECONDS,
          channelId,
          sound: "default",
        },
        apns: {
          headers: {
            "apns-priority": "10",
            "apns-push-type": "alert",
          },
          payload: {
            aps: {
              sound: "default",
              "content-available": 1,
            },
          },
        },
      });
    }

    console.log(`📨 [PUSH-MANY] Valid messages: ${messages.length}`);
    console.log(`   Skipped (invalid/empty): ${skippedInvalid}`);

    if (messages.length === 0) {
      console.log(`⚠️ [PUSH-MANY] No valid messages to send`);
      console.log(`${"═".repeat(60)}\n`);
      return { success: true, skipped: true };
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const invalidTokens = [];

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      console.log(`🚀 [PUSH-MANY] Chunk ${chunkIdx + 1}/${chunks.length} (${chunk.length})...`);

      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          if (ticket.status === "ok") {
            console.log(`   ✅ Ticket ${i}: OK`);
          } else if (ticket.status === "error") {
            const errorCode = ticket.details?.error;
            console.log(`   ❌ Ticket ${i}: ${errorCode} — ${ticket.message}`);

            if (errorCode === "DeviceNotRegistered") {
              invalidTokens.push(chunk[i].to);
            }
          }
        }
      } catch (err) {
        console.log(`   ❌ Chunk error: ${err.message}`);
      }
    }

    if (invalidTokens.length > 0) {
      await Device.destroy({ where: { fcmToken: invalidTokens } });
      console.log(`🗑️ [PUSH-MANY] Cleaned ${invalidTokens.length} invalid tokens`);
    }

    console.log(`\n✅ [PUSH-MANY] COMPLETE`);
    console.log(`   Sent    : ${messages.length}`);
    console.log(`   Tickets : ${tickets.length}`);
    console.log(`   Invalid : ${invalidTokens.length}`);
    console.log(`${"═".repeat(60)}\n`);

    return { success: true, tickets, count: messages.length };
  } catch (error) {
    console.log(`\n❌ [PUSH-MANY] FATAL: ${error.message}`);
    console.log(`${"═".repeat(60)}\n`);
    return { success: false, error: error.message };
  }
};

export default { sendPushNotification, sendPushToMany };