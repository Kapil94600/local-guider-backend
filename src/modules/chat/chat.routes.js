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
import { userRateLimit } from "../../middlewares/userRateLimiter.js";  // ✅ NEW

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// All chat routes require auth
// ═══════════════════════════════════════════════════════════════
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ✅ Rate limited: 30 messages per minute per user
// ═══════════════════════════════════════════════════════════════
router.post(
  "/send",
  userRateLimit({ windowMs: 60 * 1000, max: 30 }),
  sendMessageController
);

// ═══════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════
router.get("/conversations", getMyConversations);
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/start", startConversationController);
router.delete(
  "/conversations/:conversationId",
  authorize("ADMIN"),
  deleteConversationController
);

// ═══════════════════════════════════════════════════════════════
// MISC
// ═══════════════════════════════════════════════════════════════
router.get("/unread-count", getUnreadCountController);
router.get("/admin-id", getAdminId);

export default router;