// src/services/notificationService.js
// ═══════════════════════════════════════════════════════════════
// Notification service — channels, permissions, token registration
// ═══════════════════════════════════════════════════════════════
import { Platform } from "react-native";
import Constants from "expo-constants";
import { deviceApi } from "../api/device";
import { logger } from "../utils/logger";

const isExpoGo = Constants.executionEnvironment === "storeClient";

// ✅ Safe import — Expo Go mein notifications disabled
let Notifications = null;
if (!isExpoGo) {
  Notifications = require("expo-notifications");
}

// ═══════════════════════════════════════════════════════════════
// ANDROID CHANNELS
// ═══════════════════════════════════════════════════════════════
export const setupNotificationChannels = async () => {
  if (isExpoGo || Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFD700",
      sound: "default",
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("bookings", {
      name: "Bookings",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#10B981",
      sound: "default",
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("chat", {
      name: "Chat Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: "#3B82F6",
      sound: "default",
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#F59E0B",
      sound: "default",
      showBadge: true,
    });

    logger.log("✅ Notification channels set up");
  } catch (err) {
    logger.error("❌ Channel setup error:", err);
  }
};

// ═══════════════════════════════════════════════════════════════
// REQUEST PERMISSIONS
// ═══════════════════════════════════════════════════════════════
export const requestNotificationPermissions = async () => {
  if (isExpoGo) return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    logger.log(`🔔 Existing permission status: ${existing}`);

    if (existing === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    logger.log(`🔔 Permission after request: ${status}`);
    return status === "granted";
  } catch (err) {
    logger.error("❌ Permission error:", err);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ REGISTER EXPO PUSH TOKEN (call after login)
// ═══════════════════════════════════════════════════════════════
export const registerPushToken = async () => {
  if (isExpoGo) {
    logger.log(
      "⚠️ Expo Go — skipping push token register (Expo Go does not support push)"
    );
    return null;
  }

  try {
    // 1. Check project ID (required by Expo)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      logger.warn("⚠️ No EAS projectId — cannot register token");
      return null;
    }

    // 2. Get Expo push token
    logger.log("🎫 Requesting Expo push token...");
    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    logger.log("🎫 Expo Push Token:", token.data);

    // 3. Send to backend
    const res = await deviceApi.registerToken(token.data);
    logger.log("✅ Token registered with backend:", res?.data);

    return token.data;
  } catch (err) {
    logger.error("❌ Token register error:", err?.message);
    logger.error("Full error:", err);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// UNREGISTER TOKEN (on logout)
// ═══════════════════════════════════════════════════════════════
export const unregisterPushToken = async () => {
  if (isExpoGo) return;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token?.data) return;

    // Call backend to delete
    const { deviceApi } = require("../api/device");
    if (deviceApi?.unregisterToken) {
      await deviceApi.unregisterToken(token.data);
      logger.log("✅ Token unregistered from backend");
    }
  } catch (err) {
    logger.error("❌ Token unregister error:", err?.message);
  }
};

// ═══════════════════════════════════════════════════════════════
// SCHEDULE LOCAL NOTIFICATION — Booking Reminder
// ═══════════════════════════════════════════════════════════════
export const scheduleBookingReminder = async (booking) => {
  if (isExpoGo) return null;

  try {
    const bookingDate = new Date(booking.bookingDate);
    const reminderTime = new Date(bookingDate.getTime() - 60 * 60 * 1000);

    if (reminderTime.getTime() <= Date.now()) {
      logger.log("⏭️ Reminder time passed, skipping");
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Booking Reminder",
        body: `Your booking at ${booking.placeName || "place"} starts in 1 hour!`,
        data: {
          type: "BOOKING",
          bookingId: booking.id,
          url: `localguider://booking/${booking.id}`,
        },
        sound: "default",
        categoryIdentifier: "booking",
      },
      trigger: {
        date: reminderTime,
        channelId: "reminders",
      },
    });

    logger.log("✅ Booking reminder scheduled:", id);
    return id;
  } catch (err) {
    logger.error("❌ Schedule reminder error:", err);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// CANCEL
// ═══════════════════════════════════════════════════════════════
export const cancelNotification = async (id) => {
  if (isExpoGo || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (err) {
    logger.error("❌ Cancel notification error:", err);
  }
};

export const cancelAllNotifications = async () => {
  if (isExpoGo) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    logger.error("❌ Cancel all error:", err);
  }
};

export const dismissAllNotifications = async () => {
  if (isExpoGo) return;
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (err) {
    logger.error("❌ Dismiss error:", err);
  }
};

export const isNotificationsAvailable = () => !isExpoGo;

export default {
  setupNotificationChannels,
  requestNotificationPermissions,
  registerPushToken,
  unregisterPushToken,
  scheduleBookingReminder,
  cancelNotification,
  cancelAllNotifications,
  dismissAllNotifications,
  isNotificationsAvailable,
};