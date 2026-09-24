// src/modules/chat/chat.service.js
import { Op } from "sequelize";
import {
  findConversation,
  getConversationsByUserId,
  getConversationById,
  getMessagesByConversationId,
  createConversation,
  createMessage,
  updateConversationLastMessage,
  markMessagesAsRead,
  getUnreadCount,
  getUnreadCountForConversations,
} from "./chat.repository.js";
import User from "../../database/models/core/User.js";
import Booking from "../../database/models/core/Booking.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import { addNotification } from "../notifications/notification.service.js";
import { redisGet, redisSet } from "../../config/redis.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const isAdmin = async (userId) => {
  const user = await User.findByPk(userId, { attributes: ["id", "role"] });
  return user?.role === "ADMIN";
};

const isOtherUserAdmin = async (otherUserId) => {
  const user = await User.findByPk(otherUserId, {
    attributes: ["id", "role"],
  });
  return user?.role === "ADMIN";
};

const hasApprovedBooking = async (userId, otherUserId) => {
  const [a, b] = [userId, otherUserId].sort();
  const cacheKey = `chat:approved:${a}:${b}`;

  try {
    const cached = await redisGet(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached === "1";
    }
  } catch (e) {
    // Redis unavailable
  }

  const booking = await Booking.findOne({
    where: {
      status: { [Op.in]: ["APPROVED", "PAID", "COMPLETED"] },
      [Op.or]: [{ userId }, { userId: otherUserId }],
    },
    include: [
      {
        model: GuiderPlan,
        as: "guiderPlan",
        required: false,
        include: [
          {
            model: Guider,
            as: "guider",
            required: false,
            attributes: ["id", "userId"],
          },
        ],
        attributes: ["id", "guiderId"],
      },
      {
        model: PhotographerPlan,
        as: "photographerPlan",
        required: false,
        include: [
          {
            model: Photographer,
            as: "photographer",
            required: false,
            attributes: ["id", "userId"],
          },
        ],
        attributes: ["id", "photographerId"],
      },
    ],
  });

  let result = false;

  if (booking) {
    const customerId = booking.userId;
    const guiderUserId = booking.guiderPlan?.guider?.userId;
    const photographerUserId =
      booking.photographerPlan?.photographer?.userId;

    if (
      (customerId === userId &&
        (guiderUserId === otherUserId ||
          photographerUserId === otherUserId)) ||
      (customerId === otherUserId &&
        (guiderUserId === userId || photographerUserId === userId))
    ) {
      result = true;
    }
  }

  try {
    await redisSet(cacheKey, result ? "1" : "0", 300);
  } catch (e) {
    // ignore
  }

  return result;
};

// ═══════════════════════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════════════════════
export const sendMessage = async (
  senderId,
  receiverId,
  messageData,
  bookingId = null
) => {
  if (senderId === receiverId) {
    throw new Error("You cannot send a message to yourself");
  }

  const adminCheck = await isAdmin(senderId);
  const receiverAdminCheck = await isOtherUserAdmin(receiverId);

  if (!adminCheck && !receiverAdminCheck) {
    const approved = await hasApprovedBooking(senderId, receiverId);
    if (!approved) {
      throw new Error("Chat is only allowed after an approved booking");
    }
  }

  let conversation = await findConversation(senderId, receiverId);

  if (!conversation) {
    const [sender, receiver] = await Promise.all([
      User.findByPk(senderId),
      User.findByPk(receiverId),
    ]);

    const [participant1Id, participant2Id] = [senderId, receiverId].sort();
    const participant1Role =
      participant1Id === senderId
        ? sender?.role || "USER"
        : receiver?.role || "USER";
    const participant2Role =
      participant2Id === receiverId
        ? receiver?.role || "USER"
        : sender?.role || "USER";

    conversation = await createConversation({
      participant1Id,
      participant2Id,
      participant1Role,
      participant2Role,
      bookingId: bookingId || null,
      lastMessage: messageData.content,
      lastMessageAt: new Date(),
    });
  } else if (bookingId && !conversation.bookingId) {
    await conversation.update({ bookingId });
  }

  const message = await createMessage({
    conversationId: conversation.id,
    senderId,
    messageType: messageData.messageType || "TEXT",
    content: messageData.content,
    mediaUrl: messageData.mediaUrl || null,
  });

  await updateConversationLastMessage(
    conversation.id,
    messageData.content,
    new Date()
  );

  const senderUser = await User.findByPk(senderId, {
    attributes: ["id", "firstName", "lastName", "profileImage"],
  });

  const receiver = await User.findByPk(receiverId, {
    attributes: ["id", "firstName", "lastName"],
  });

  if (receiver) {
    try {
      await addNotification({
        userId: receiverId,
        title: "New Message",
        message: `You have a new message from ${
          senderUser?.firstName || "User"
        }`,
        type: "CHAT",
        data: {
          conversationId: conversation.id,
          senderId,
        },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (notifError) {
      logger.error(`Chat notification failed: ${notifError.message}`);
    }
  }

  return {
    message: {
      ...message.toJSON(),
      sender: senderUser,
    },
    conversationId: conversation.id,
  };
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: MARK CONVERSATION AS READ
// ═══════════════════════════════════════════════════════════════
export const markConversationAsRead = async (conversationId, userId) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  // Verify user is participant
  if (
    conversation.participant1Id !== userId &&
    conversation.participant2Id !== userId
  ) {
    throw new Error("Not authorized to mark this conversation as read");
  }

  const [updated] = await markMessagesAsRead(conversationId, userId);

  const otherUserId =
    conversation.participant1Id === userId
      ? conversation.participant2Id
      : conversation.participant1Id;

  return { updated, otherUserId };
};

// ═══════════════════════════════════════════════════════════════
// START CONVERSATION
// ═══════════════════════════════════════════════════════════════
export const startConversation = async (
  userId,
  otherUserId,
  bookingId = null
) => {
  const adminCheck = await isAdmin(userId);
  const otherAdminCheck = await isOtherUserAdmin(otherUserId);

  if (!adminCheck && !otherAdminCheck) {
    const approved = await hasApprovedBooking(userId, otherUserId);
    if (!approved) {
      throw new Error("Chat is only allowed after an approved booking");
    }
  }

  let conversation = await findConversation(userId, otherUserId);

  if (!conversation) {
    const [user, otherUser] = await Promise.all([
      User.findByPk(userId),
      User.findByPk(otherUserId),
    ]);

    const [participant1Id, participant2Id] = [userId, otherUserId].sort();
    const participant1Role =
      participant1Id === userId
        ? user?.role || "USER"
        : otherUser?.role || "USER";
    const participant2Role =
      participant2Id === otherUserId
        ? otherUser?.role || "USER"
        : user?.role || "USER";

    conversation = await createConversation({
      participant1Id,
      participant2Id,
      participant1Role,
      participant2Role,
      bookingId: bookingId || null,
    });
  } else if (bookingId && !conversation.bookingId) {
    await conversation.update({ bookingId });
  }

  const fullConversation = await getConversationById(conversation.id);
  return fullConversation;
};

// ═══════════════════════════════════════════════════════════════
// GET user's conversations
// ═══════════════════════════════════════════════════════════════
export const getUserConversations = async (userId) => {
  const conversations = await getConversationsByUserId(userId);

  const conversationIds = conversations.map((c) => c.id);
  const unreadMap = await getUnreadCountForConversations(
    userId,
    conversationIds
  );

  return conversations.map((conversation) => {
    const isParticipant1 = conversation.participant1Id === userId;
    const otherParticipant = isParticipant1
      ? conversation.participant2
      : conversation.participant1;
    const otherParticipantId = isParticipant1
      ? conversation.participant2Id
      : conversation.participant1Id;
    const otherParticipantRole = isParticipant1
      ? conversation.participant2Role
      : conversation.participant1Role;

    return {
      id: conversation.id,
      bookingId: conversation.bookingId,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: unreadMap[conversation.id] || 0,
      otherParticipant: {
        id: otherParticipantId,
        role: otherParticipantRole,
        name: otherParticipant?.firstName
          ? `${otherParticipant.firstName} ${
              otherParticipant.lastName || ""
            }`.trim()
          : "Unknown",
        profileImage: otherParticipant?.profileImage || null,
        phone: otherParticipant?.phone || null,
      },
      participant1Id: conversation.participant1Id,
      participant2Id: conversation.participant2Id,
      participant1: conversation.participant1,
      participant2: conversation.participant2,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  });
};

// ═══════════════════════════════════════════════════════════════
// GET messages
// ═══════════════════════════════════════════════════════════════
export const getMessages = async (
  conversationId,
  userId,
  { page = 1, limit = 50 } = {}
) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  if (
    conversation.participant1Id !== userId &&
    conversation.participant2Id !== userId
  ) {
    throw new Error("You are not authorized to view this conversation");
  }

  await markMessagesAsRead(conversationId, userId);

  const result = await getMessagesByConversationId(conversationId, {
    page,
    limit,
  });
  const messages = result.rows.reverse();

  return {
    messages,
    total: result.count,
    page,
    limit,
    hasMore: page * limit < result.count,
  };
};

// ═══════════════════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════════════════
export const getUnreadMessageCount = async (userId) => {
  return await getUnreadCount(userId);
};

// ═══════════════════════════════════════════════════════════════
// DELETE conversation (admin)
// ═══════════════════════════════════════════════════════════════
export const deleteConversation = async (conversationId) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  await conversation.destroy();
  return { message: "Conversation deleted successfully" };
};

// ═══════════════════════════════════════════════════════════════
// UTIL: Invalidate chat cache
// ═══════════════════════════════════════════════════════════════
export const invalidateChatCache = async (userId1, userId2) => {
  const [a, b] = [userId1, userId2].sort();
  const cacheKey = `chat:approved:${a}:${b}`;
  try {
    const { redisDel } = await import("../../config/redis.js");
    await redisDel(cacheKey);
  } catch (e) {
    // ignore
  }
};