// src/modules/chat/chat.service.js
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

const isAdmin = async (userId) => {
  const user = await User.findByPk(userId);
  return user?.role === "ADMIN";
};

const isOtherUserAdmin = async (otherUserId) => {
  const user = await User.findByPk(otherUserId);
  return user?.role === "ADMIN";
};

const hasApprovedBooking = async (userId, otherUserId) => {
  const guider = await Guider.findOne({ where: { userId: otherUserId } });
  if (guider) {
    const booking = await Booking.findOne({
      where: { userId, status: "APPROVED" },
      include: [{
        model: GuiderPlan,
        as: "guiderPlan",
        include: [{ model: Guider, as: "guider", where: { id: guider.id }, required: true }],
        required: true,
      }],
    });
    if (booking) return true;
  }

  const guiderOfUser = await Guider.findOne({ where: { userId } });
  if (guiderOfUser) {
    const booking = await Booking.findOne({
      where: { userId: otherUserId, status: "APPROVED" },
      include: [{
        model: GuiderPlan,
        as: "guiderPlan",
        include: [{ model: Guider, as: "guider", where: { id: guiderOfUser.id }, required: true }],
        required: true,
      }],
    });
    if (booking) return true;
  }

  const photographer = await Photographer.findOne({ where: { userId: otherUserId } });
  if (photographer) {
    const booking = await Booking.findOne({
      where: { userId, status: "APPROVED" },
      include: [{
        model: PhotographerPlan,
        as: "photographerPlan",
        include: [{ model: Photographer, as: "photographer", where: { id: photographer.id }, required: true }],
        required: true,
      }],
    });
    if (booking) return true;
  }

  const photographerOfUser = await Photographer.findOne({ where: { userId } });
  if (photographerOfUser) {
    const booking = await Booking.findOne({
      where: { userId: otherUserId, status: "APPROVED" },
      include: [{
        model: PhotographerPlan,
        as: "photographerPlan",
        include: [{ model: Photographer, as: "photographer", where: { id: photographerOfUser.id }, required: true }],
        required: true,
      }],
    });
    if (booking) return true;
  }

  return false;
};

// ✅ Send message — reuses existing conversation for user pair
export const sendMessage = async (senderId, receiverId, messageData, bookingId = null) => {
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

  // ✅ FIX: find conversation by participants only (no bookingId)
  let conversation = await findConversation(senderId, receiverId);

  if (!conversation) {
    const [sender, receiver] = await Promise.all([
      User.findByPk(senderId),
      User.findByPk(receiverId),
    ]);

    const [participant1Id, participant2Id] = [senderId, receiverId].sort();
    const participant1Role = participant1Id === senderId ? sender?.role || "USER" : receiver?.role || "USER";
    const participant2Role = participant2Id === receiverId ? receiver?.role || "USER" : sender?.role || "USER";

    conversation = await createConversation({
      participant1Id,
      participant2Id,
      participant1Role,
      participant2Role,
      bookingId: bookingId || null,   // ✅ store as metadata only
      lastMessage: messageData.content,
      lastMessageAt: new Date(),
    });
  } else if (bookingId && !conversation.bookingId) {
    // ✅ attach latest booking context if conversation had none
    await conversation.update({ bookingId });
  }

  const message = await createMessage({
    conversationId: conversation.id,
    senderId,
    messageType: messageData.messageType || "TEXT",
    content: messageData.content,
    mediaUrl: messageData.mediaUrl || null,
  });

  await updateConversationLastMessage(conversation.id, messageData.content, new Date());

  const senderUser = await User.findByPk(senderId, {
    attributes: ["id", "firstName", "lastName", "profileImage"],
  });

  const receiver = await User.findByPk(receiverId, { attributes: ["id", "firstName", "lastName"] });
  if (receiver) {
    try {
      await addNotification({
        userId: receiverId,
        title: "New Message",
        message: `You have a new message from ${senderUser?.firstName || "User"}`,
        type: "CHAT",
        data: { conversationId: conversation.id },
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
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

// ✅ Start conversation — returns existing if user pair already chatting
export const startConversation = async (userId, otherUserId, bookingId = null) => {
  const adminCheck = await isAdmin(userId);
  const otherAdminCheck = await isOtherUserAdmin(otherUserId);

  if (!adminCheck && !otherAdminCheck) {
    const approved = await hasApprovedBooking(userId, otherUserId);
    if (!approved) {
      throw new Error("Chat is only allowed after an approved booking");
    }
  }

  // ✅ FIX: reuse existing conversation for the pair
  let conversation = await findConversation(userId, otherUserId);

  if (!conversation) {
    const [user, otherUser] = await Promise.all([
      User.findByPk(userId),
      User.findByPk(otherUserId),
    ]);

    const [participant1Id, participant2Id] = [userId, otherUserId].sort();
    const participant1Role = participant1Id === userId ? user?.role || "USER" : otherUser?.role || "USER";
    const participant2Role = participant2Id === otherUserId ? otherUser?.role || "USER" : user?.role || "USER";

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

export const getUserConversations = async (userId) => {
  const conversations = await getConversationsByUserId(userId);

  const conversationIds = conversations.map((c) => c.id);
  const unreadMap = await getUnreadCountForConversations(userId, conversationIds);

  return conversations.map((conversation) => {
    const isParticipant1 = conversation.participant1Id === userId;
    const otherParticipant = isParticipant1 ? conversation.participant2 : conversation.participant1;
    const otherParticipantId = isParticipant1 ? conversation.participant2Id : conversation.participant1Id;
    const otherParticipantRole = isParticipant1 ? conversation.participant2Role : conversation.participant1Role;

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
          ? `${otherParticipant.firstName} ${otherParticipant.lastName || ""}`.trim()
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

export const getMessages = async (conversationId, userId, { page = 1, limit = 50 } = {}) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    throw new Error("You are not authorized to view this conversation");
  }

  await markMessagesAsRead(conversationId, userId);

  const result = await getMessagesByConversationId(conversationId, { page, limit });
  const messages = result.rows.reverse();

  return {
    messages,
    total: result.count,
    page,
    limit,
    hasMore: page * limit < result.count,
  };
};

export const getUnreadMessageCount = async (userId) => {
  return await getUnreadCount(userId);
};

export const deleteConversation = async (conversationId) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  await conversation.destroy();
  return { message: "Conversation deleted successfully" };
};