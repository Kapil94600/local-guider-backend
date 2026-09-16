// src/modules/chat/chat.repository.js
import { Op } from "sequelize";
import { Sequelize } from "sequelize";
import Conversation from "../../database/models/core/Conversation.js";
import Message from "../../database/models/core/Message.js";
import User from "../../database/models/core/User.js";
import Booking from "../../database/models/core/Booking.js";

// ✅ FIX: find by participant pair ONLY (ignore bookingId)
export const findConversation = async (participant1Id, participant2Id, bookingId = null) => {
  const where = {
    [Op.or]: [
      { participant1Id, participant2Id },
      { participant1Id: participant2Id, participant2Id: participant1Id },
    ],
  };
  // ❌ DON'T filter by bookingId — same pair always shares one conversation
  return await Conversation.findOne({ where });
};

export const getConversationsByUserId = async (userId) => {
  const conversations = await Conversation.findAll({
    where: {
      [Op.or]: [
        { participant1Id: userId },
        { participant2Id: userId },
      ],
    },
    include: [
      {
        model: User,
        as: "participant1",
        attributes: ["id", "firstName", "lastName", "profileImage", "phone"],
      },
      {
        model: User,
        as: "participant2",
        attributes: ["id", "firstName", "lastName", "profileImage", "phone"],
      },
    ],
    order: [["lastMessageAt", "DESC"]],
  });
  return conversations;
};

export const getConversationById = async (conversationId) => {
  return await Conversation.findByPk(conversationId, {
    include: [
      {
        model: User,
        as: "participant1",
        attributes: ["id", "firstName", "lastName", "profileImage", "phone"],
      },
      {
        model: User,
        as: "participant2",
        attributes: ["id", "firstName", "lastName", "profileImage", "phone"],
      },
    ],
  });
};

export const getMessagesByConversationId = async (conversationId, { page = 1, limit = 50 } = {}) => {
  const offset = (page - 1) * limit;
  return await Message.findAndCountAll({
    where: { conversationId },
    include: [
      {
        model: User,
        as: "sender",
        attributes: ["id", "firstName", "lastName", "profileImage"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
};

export const createConversation = async (data) => {
  return await Conversation.create(data);
};

export const createMessage = async (data) => {
  return await Message.create(data);
};

export const updateConversationLastMessage = async (conversationId, lastMessage, lastMessageAt) => {
  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) return null;
  await conversation.update({ lastMessage, lastMessageAt });
  return conversation;
};

export const markMessagesAsRead = async (conversationId, userId) => {
  return await Message.update(
    { isRead: true, readAt: new Date() },
    {
      where: {
        conversationId,
        senderId: { [Op.ne]: userId },
        isRead: false,
      },
    }
  );
};

export const getUnreadCount = async (userId) => {
  const conversations = await Conversation.findAll({
    where: {
      [Op.or]: [
        { participant1Id: userId },
        { participant2Id: userId },
      ],
    },
    attributes: ["id"],
  });

  if (conversations.length === 0) return 0;

  const conversationIds = conversations.map((c) => c.id);

  return await Message.count({
    where: {
      conversationId: { [Op.in]: conversationIds },
      senderId: { [Op.ne]: userId },
      isRead: false,
    },
  });
};

export const getUnreadCountForConversations = async (userId, conversationIds) => {
  if (!conversationIds || conversationIds.length === 0) return {};
  const counts = await Message.findAll({
    attributes: [
      "conversationId",
      [Sequelize.fn("COUNT", Sequelize.col("id")), "unreadCount"],
    ],
    where: {
      conversationId: { [Op.in]: conversationIds },
      senderId: { [Op.ne]: userId },
      isRead: false,
    },
    group: ["conversationId"],
    raw: true,
  });
  const map = {};
  counts.forEach((c) => {
    map[c.conversationId] = parseInt(c.unreadCount, 10);
  });
  return map;
};