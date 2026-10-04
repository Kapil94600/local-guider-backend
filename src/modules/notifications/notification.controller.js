// src/modules/notifications/notification.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  fetchMyNotifications,
  fetchNotificationDetail,
  readNotification,
  readAllNotifications,
  removeNotification,
  removeAllNotifications,
  fetchUnreadCount,
} from "./notification.service.js";

// ═══════════════════════════════════════════════════════════════
// GET /notifications — my notifications list
// ═══════════════════════════════════════════════════════════════
export const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await fetchMyNotifications(req.user.id, {
      page,
      limit,
    });
    return ApiResponse.success(res, "Notifications fetched", notifications);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: GET /notifications/:id — full detail with booking
// ═══════════════════════════════════════════════════════════════
export const getNotificationDetailController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await fetchNotificationDetail(id, req.user.id);
    return ApiResponse.success(res, "Notification detail fetched", notification);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /notifications/:id/read
// ═══════════════════════════════════════════════════════════════
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await readNotification(req.params.id, req.user.id);
    return ApiResponse.success(res, "Notification marked as read", notification);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /notifications/read-all
// ═══════════════════════════════════════════════════════════════
export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await readAllNotifications(req.user.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// DELETE /notifications/:id
// ═══════════════════════════════════════════════════════════════
export const deleteMyNotification = async (req, res, next) => {
  try {
    const result = await removeNotification(req.params.id, req.user.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// DELETE /notifications
// ═══════════════════════════════════════════════════════════════
export const deleteAllMyNotifications = async (req, res, next) => {
  try {
    const result = await removeAllNotifications(req.user.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /notifications/unread-count
// ═══════════════════════════════════════════════════════════════
export const getUnreadCountController = async (req, res, next) => {
  try {
    const count = await fetchUnreadCount(req.user.id);
    return ApiResponse.success(res, "Unread count fetched", {
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
};