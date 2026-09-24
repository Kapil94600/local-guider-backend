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
  sendMediaController,
  markConversationReadController,
} from "./chat.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { userRateLimit } from "../../middlewares/userRateLimiter.js";
import { uploadChatMedia } from "../../middlewares/uploadMiddleware.js";  // ✅ UPDATED

const router = express.Router();

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════
router.post(
  "/send",
  userRateLimit({ windowMs: 60 * 1000, max: 30 }),
  sendMessageController
);

router.post(
  "/send-media",
  userRateLimit({ windowMs: 60 * 1000, max: 20 }),
  uploadChatMedia.single("media"),  // ✅ UPDATED
  sendMediaController
);

// ═══════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════
router.get("/conversations", getMyConversations);
router.get(
  "/conversations/:conversationId/messages",
  getConversationMessages
);
router.post("/conversations/start", startConversationController);
router.post(
  "/conversations/:conversationId/read",
  markConversationReadController
);
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