import { Expo } from "expo-server-sdk";
import Device from "../../database/models/core/Device.js";

const expo = new Expo();

export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const devices = await Device.findAll({ where: { userId } });
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
      });
    }

    if (messages.length === 0) return { success: true, skipped: true };

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Push send error:", error);
      }
    }

    return { success: true, tickets };
  } catch (error) {
    console.error("Push notification error:", error);
    return { success: false, error: error.message };
  }
};