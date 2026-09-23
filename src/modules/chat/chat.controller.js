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
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════════════════════
export const sendMessageController = async (req, res, next) => {
  try {
    const {
      receiverId,
      content,
      messageType = "TEXT",
      mediaUrl = null,
      bookingId = null,
    } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: "receiverId and content are required",
      });
    }

    const result = await sendMessage(
      req.user.id,
      receiverId,
      { content, messageType, mediaUrl },
      bookingId
    );

    // ✅ Emit to receiver's room
    const io = req.app.get("io");
    if (io) {
      logger.info(
        `📤 chat:new-message → user:${receiverId.slice(0, 8)} | from:${req.user.id.slice(0, 8)}`
      );
      io.to(`user:${receiverId}`).emit("chat:new-message", result);
      io.to(`user:${req.user.id}`).emit("chat:message-sent", result);
    } else {
      logger.warn("⚠️ Socket.io not available — message not emitted");
    }

    return ApiResponse.success(res, "Message sent successfully", result);
  } catch (error) {
    logger.error(`sendMessageController error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET MY CONVERSATIONS
// ═══════════════════════════════════════════════════════════════
export const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await getUserConversations(req.user.id);
    return ApiResponse.success(
      res,
      "Conversations fetched successfully",
      conversations
    );
  } catch (error) {
    logger.error(`getMyConversations error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET CONVERSATION MESSAGES
// ═══════════════════════════════════════════════════════════════
export const getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const result = await getMessages(conversationId, req.user.id, {
      page,
      limit,
    });
    return ApiResponse.success(
      res,
      "Messages fetched successfully",
      result
    );
  } catch (error) {
    logger.error(`getConversationMessages error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// START CONVERSATION
// ═══════════════════════════════════════════════════════════════
export const startConversationController = async (req, res, next) => {
  try {
    const { otherUserId, bookingId } = req.body;
    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: "otherUserId is required",
      });
    }
    const conversation = await startConversation(
      req.user.id,
      otherUserId,
      bookingId
    );
    return ApiResponse.success(res, "Conversation ready", conversation);
  } catch (error) {
    logger.error(`startConversationController error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET UNREAD COUNT
// ═══════════════════════════════════════════════════════════════
export const getUnreadCountController = async (req, res, next) => {
  try {
    const count = await getUnreadMessageCount(req.user.id);
    return ApiResponse.success(res, "Unread count fetched", {
      unreadCount: count,
    });
  } catch (error) {
    logger.error(`getUnreadCountController error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// DELETE CONVERSATION (Admin)
// ═══════════════════════════════════════════════════════════════
export const deleteConversationController = async (req, res, next) => {
  try {
    const result = await deleteConversation(req.params.conversationId);
    logger.info(
      `🗑️ Conversation deleted by admin: ${req.params.conversationId.slice(0, 8)}`
    );
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    logger.error(`deleteConversationController error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET ADMIN ID (for HelpSupport)
// ═══════════════════════════════════════════════════════════════
export const getAdminId = async (req, res, next) => {
  try {
    const admin = await User.findOne({
      where: { role: "ADMIN" },
      attributes: ["id", "firstName", "lastName"],
    });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "No admin found",
      });
    }
    return res.status(200).json({
      success: true,
      data: { adminId: admin.id },
    });
  } catch (error) {
    logger.error(`getAdminId error: ${error.message}`);
    next(error);
  }
};