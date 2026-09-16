import { ApiResponse } from "../../utils/apiResponse.js";
import {
  fetchMyNotifications,
  readNotification,
  readAllNotifications,
  removeNotification,
  removeAllNotifications,
  fetchUnreadCount,
} from "./notification.service.js";

export const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await fetchMyNotifications(req.user.id, { page, limit });
    return ApiResponse.success(res, "Notifications fetched successfully", notifications);
  } catch (error) { next(error); }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await readNotification(req.params.id, req.user.id);
    return ApiResponse.success(res, "Notification marked as read", notification);
  } catch (error) { next(error); }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await readAllNotifications(req.user.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};

export const deleteMyNotification = async (req, res, next) => {
  try {
    const result = await removeNotification(req.params.id, req.user.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};

export const deleteAllMyNotifications = async (req, res, next) => {
  try {
    const result = await removeAllNotifications(req.user.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};

export const getUnreadCountController = async (req, res, next) => {
  try {
    const count = await fetchUnreadCount(req.user.id);
    return ApiResponse.success(res, "Unread count fetched", { unreadCount: count });
  } catch (error) { next(error); }
};