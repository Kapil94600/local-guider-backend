// src/modules/chat/chat.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  sendMessage,
  getUserConversations,
  getMessages,
  startConversation,
  getUnreadMessageCount,
  deleteConversation,
} from "./chat.service.js";
import User from "../../database/models/core/User.js";

export const sendMessageController = async (req, res, next) => {
  try {
    const { receiverId, content, messageType = "TEXT", mediaUrl = null, bookingId = null } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: "receiverId and content are required" });
    }
    const result = await sendMessage(req.user.id, receiverId, { content, messageType, mediaUrl }, bookingId);

    // ✅ FIX: Emit to receiver's room with full logging
    const io = req.app.get("io");
    if (io) {
      console.log(`📤 Emitting chat:new-message to user:${receiverId}`);
      io.to(`user:${receiverId}`).emit("chat:new-message", result);
      io.to(`user:${req.user.id}`).emit("chat:message-sent", result);
    } else {
      console.warn("⚠️ Socket.io not available on app — message not emitted");
    }

    return ApiResponse.success(res, "Message sent successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await getUserConversations(req.user.id);
    return ApiResponse.success(res, "Conversations fetched successfully", conversations);
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const result = await getMessages(conversationId, req.user.id, { page, limit });
    return ApiResponse.success(res, "Messages fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const startConversationController = async (req, res, next) => {
  try {
    const { otherUserId, bookingId } = req.body;
    if (!otherUserId) {
      return res.status(400).json({ success: false, message: "otherUserId is required" });
    }
    const conversation = await startConversation(req.user.id, otherUserId, bookingId);
    return ApiResponse.success(res, "Conversation ready", conversation);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCountController = async (req, res, next) => {
  try {
    const count = await getUnreadMessageCount(req.user.id);
    return ApiResponse.success(res, "Unread count fetched", { unreadCount: count });
  } catch (error) {
    next(error);
  }
};

export const deleteConversationController = async (req, res, next) => {
  try {
    const result = await deleteConversation(req.params.conversationId);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};

export const getAdminId = async (req, res, next) => {
  try {
    const admin = await User.findOne({
      where: { role: "ADMIN" },
      attributes: ["id", "firstName", "lastName"],
    });
    if (!admin) {
      return res.status(404).json({ success: false, message: "No admin found" });
    }
    return res.status(200).json({ success: true, data: { adminId: admin.id } });
  } catch (error) {
    next(error);
  }
};