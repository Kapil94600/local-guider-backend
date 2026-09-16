// src/modules/chat/chat.routes.js
import express from "express";
import {
  sendMessageController,
  getMyConversations,
  getConversationMessages,
  startConversationController,
  getUnreadCountController,
  deleteConversationController,
  getAdminId,
} from "./chat.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

// Send a message
router.post("/send", sendMessageController);

// Get all conversations for the logged-in user
router.get("/conversations", getMyConversations);

// Get messages for a specific conversation
router.get("/conversations/:conversationId/messages", getConversationMessages);

// Start a conversation (or get existing)
router.post("/conversations/start", startConversationController);

// Get unread message count
router.get("/unread-count", getUnreadCountController);

// ✅ Get Admin ID (for Help Support)
router.get("/admin-id", getAdminId);

// Delete conversation (admin only)
router.delete("/conversations/:conversationId", authorize("ADMIN"), deleteConversationController);

export default router;