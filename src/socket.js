// src/socket.js
import { Server } from "socket.io";
import http from "http";
import app from "./app.js";
import { sendMessage } from "./modules/chat/chat.service.js";
import {
  markMessagesAsRead,
  getConversationById,
} from "./modules/chat/chat.repository.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("register", (userId) => {
    if (!userId) return;
    const room = `user:${userId}`;
    socket.join(room);
    onlineUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} registered → room ${room} (socket ${socket.id})`);
  });

  socket.on("chat:send", async (data) => {
    try {
      const { receiverId, content, messageType, mediaUrl, bookingId } = data;
      const senderId = data.senderId || socket.userId;
      console.log(`📤 chat:send from ${senderId} to ${receiverId}`);
      const result = await sendMessage(senderId, receiverId, { content, messageType, mediaUrl }, bookingId);
      io.to(`user:${receiverId}`).emit("chat:new-message", result);
      socket.emit("chat:message-sent", result);
    } catch (error) {
      console.error("❌ chat:send error:", error.message);
      socket.emit("chat:error", { message: error.message });
    }
  });

  socket.on("chat:mark-read", async (data) => {
    try {
      const { conversationId, userId } = data;
      await markMessagesAsRead(conversationId, userId);
      const conversation = await getConversationById(conversationId);
      if (conversation) {
        const otherUserId = conversation.participant1Id === userId
          ? conversation.participant2Id
          : conversation.participant1Id;
        io.to(`user:${otherUserId}`).emit("chat:messages-read", { conversationId, readBy: userId });
      }
    } catch (error) {
      console.error("Mark read error:", error);
    }
  });

  socket.on("chat:typing", (data) => {
    const { conversationId, userId, isTyping, receiverId } = data;
    socket.to(`user:${receiverId}`).emit("chat:typing", { conversationId, userId, isTyping });
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`❌ User ${userId} disconnected (socket ${socket.id})`);
        break;
      }
    }
  });
});

app.set("io", io);
export { server, io, onlineUsers };