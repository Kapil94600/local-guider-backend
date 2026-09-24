// src/modules/chat/chat.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  sendMessage,
  getUserConversations,
  getMessages,
  startConversation,
  getUnreadMessageCount,
  deleteConversation,
  markConversationAsRead,   // ✅ NEW
} from "./chat.service.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";  // ✅ NEW
import User from "../../database/models/core/User.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// SEND MESSAGE (text)
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

    // Emit socket
    const io = req.app.get("io");
    if (io) {
      logger.info(
        `📤 chat:new-message → user:${receiverId.slice(0, 8)}`
      );
      io.to(`user:${receiverId}`).emit("chat:new-message", result);
      io.to(`user:${req.user.id}`).emit("chat:message-sent", result);
    }

    return ApiResponse.success(res, "Message sent successfully", result);
  } catch (error) {
    logger.error(`sendMessageController error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: SEND MEDIA (image/file/voice)
// ═══════════════════════════════════════════════════════════════
export const sendMediaController = async (req, res, next) => {
  try {
    const { receiverId, conversationId, messageType = "IMAGE", bookingId } =
      req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Media file is required (field name: 'media')",
      });
    }

    // Validate messageType
    const allowedTypes = ["IMAGE", "FILE", "LOCATION"];
    const safeType = allowedTypes.includes(messageType)
      ? messageType
      : "IMAGE";

    // Upload to Cloudinary
    let mediaUrl = null;
    try {
      mediaUrl = await uploadToCloudinary(
        req.file.buffer,
        "local-guider/chat"
      );
    } catch (uploadErr) {
      logger.error(`Media upload failed: ${uploadErr.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to upload media",
      });
    }

    if (!mediaUrl) {
      return res.status(500).json({
        success: false,
        message: "Upload returned no URL",
      });
    }

    // Send via existing service
    const result = await sendMessage(
      req.user.id,
      receiverId,
      {
        content: mediaUrl, // For media, content = URL
        messageType: safeType,
        mediaUrl,
      },
      bookingId
    );

    // Emit socket
    const io = req.app.get("io");
    if (io) {
      logger.info(
        `📤 chat:new-message (media) → user:${receiverId.slice(0, 8)}`
      );
      io.to(`user:${receiverId}`).emit("chat:new-message", result);
      io.to(`user:${req.user.id}`).emit("chat:message-sent", result);
    }

    return ApiResponse.success(res, "Media sent successfully", result);
  } catch (error) {
    logger.error(`sendMediaController error: ${error.message}`);
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
// ✅ NEW: MARK CONVERSATION AS READ (REST endpoint)
// ═══════════════════════════════════════════════════════════════
export const markConversationReadController = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const result = await markConversationAsRead(conversationId, userId);

    // Emit socket for read receipt
    const io = req.app.get("io");
    if (io && result?.otherUserId) {
      io.to(`user:${result.otherUserId}`).emit("chat:read", {
        conversationId,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
    }

    return ApiResponse.success(res, "Messages marked as read", {
      conversationId,
      updated: result?.updated || 0,
    });
  } catch (error) {
    logger.error(`markConversationRead error: ${error.message}`);
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