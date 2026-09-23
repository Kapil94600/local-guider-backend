// src/modules/admin/adminNotification.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import { broadcastNotification, fetchAllNotifications } from "./adminNotification.service.js";

export const sendBroadcast = async (req, res, next) => {
  try {
    const { title, message, type, targetRole, channels } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }
    const result = await broadcastNotification({ title, message, type, targetRole, channels });
    return ApiResponse.success(res, "Notification sent", { count: result.length });
  } catch (error) { next(error); }
};

export const getAllNotifications = async (req, res, next) => {
  try {
    const notifications = await fetchAllNotifications(req.query);
    return ApiResponse.success(res, "Notifications fetched", notifications);
  } catch (error) { next(error); }
};