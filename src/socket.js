// src/socket.js
import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import app from "./app.js";
import { env } from "./config/env.js";
import User from "./database/models/core/User.js";
import { sendMessage } from "./modules/chat/chat.service.js";
import {
  markMessagesAsRead,
  getConversationById,
  getConversationsByUserId,
} from "./modules/chat/chat.repository.js";
import { redisGet, redisSet } from "./config/redis.js";
import { logger } from "./utils/logger.js";

const server = http.createServer(app);

// ═══════════════════════════════════════════════════════════════
// CORS
// ═══════════════════════════════════════════════════════════════
const allowedOrigins = (env.CORS_ORIGIN || [])
  .map((o) => (typeof o === "string" ? o.trim() : o))
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^https:\/\/local-guider-admin.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  },

  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,

  transports: ["polling", "websocket"],
  allowUpgrades: true,

  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1] ||
      socket.handshake.query?.token;

    if (!token) {
      logger.warn("⚠️ Socket connection rejected: No token");
      return next(new Error("Authentication required"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      logger.warn(`⚠️ Socket JWT verify failed: ${err.message}`);
      return next(new Error("Invalid or expired token"));
    }

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "role", "isActive", "accountStatus"],
    });

    if (!user) return next(new Error("User no longer exists"));
    if (!user.isActive) return next(new Error("Account is inactive"));
    if (user.accountStatus === "BLOCKED")
      return next(new Error("Account is blocked"));
    if (user.accountStatus === "SUSPENDED")
      return next(new Error("Account is suspended"));
    if (user.accountStatus === "DELETED")
      return next(new Error("Account is deleted"));

    socket.userId = user.id;
    socket.userRole = user.role;
    next();
  } catch (error) {
    logger.error(`❌ Socket auth error: ${error.message}`);
    return next(new Error("Authentication failed"));
  }
});

// ═══════════════════════════════════════════════════════════════
// Online users map — userId → Set<socketId>
// ═══════════════════════════════════════════════════════════════
const onlineUsers = new Map();

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-5: Presence broadcast with Redis caching
// - Cache chat partners for 5 min to avoid N+1 queries
// - Only emit to relevant users (self + chat partners)
// ═══════════════════════════════════════════════════════════════
const broadcastPresence = async (userId, isOnline) => {
  try {
    // Emit to the user's own room (multi-device sync)
    io.to(`user:${userId}`).emit("presence:update", {
      userId,
      isOnline,
    });

    // ✅ FIX B-5: Try cache first
    const cacheKey = `user-chat-partners:${userId}`;
    let partnerIds = null;

    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        partnerIds = JSON.parse(cached);
      }
    } catch (e) {
      // Redis unavailable — fall through to DB
    }

    // ✅ Cache miss — fetch from DB
    if (!partnerIds) {
      const conversations = await getConversationsByUserId(userId);
      partnerIds = [];
      const seen = new Set();

      for (const conv of conversations) {
        const partnerId =
          conv.participant1Id === userId
            ? conv.participant2Id
            : conv.participant1Id;
        if (partnerId && partnerId !== userId && !seen.has(partnerId)) {
          seen.add(partnerId);
          partnerIds.push(partnerId);
        }
      }

      // Cache for 5 minutes
      try {
        await redisSet(cacheKey, JSON.stringify(partnerIds), 300);
      } catch (e) {
        // Redis unavailable — ignore
      }
    }

    // Emit only to chat partners
    for (const partnerId of partnerIds) {
      io.to(`user:${partnerId}`).emit("presence:update", {
        userId,
        isOnline,
      });
    }
  } catch (error) {
    logger.error(`broadcastPresence error: ${error.message}`);
  }
};

// ✅ NEW: Invalidate partner cache when conversation changes
export const invalidatePartnerCache = async (userId) => {
  try {
    const { redisDel } = await import("./config/redis.js");
    await redisDel(`user-chat-partners:${userId}`);
  } catch (e) {
    // ignore
  }
};

io.on("connection", (socket) => {
  const userId = socket.userId;
  const userRole = socket.userRole;

  logger.info(
    `✅ Socket connected: ${socket.id} | user: ${userId} | role: ${userRole}`
  );

  // Auto-join room
  const room = `user:${userId}`;
  socket.join(room);

  // Track online (multi-device)
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // ✅ Broadcast presence ONLY to relevant users
  broadcastPresence(userId, true);

  // ═══════════════════════════════════════════
  // register (legacy)
  // ═══════════════════════════════════════════
  socket.on("register", () => {
    socket.join(room);
    logger.info(`👤 User ${userId} re-registered → ${room}`);
  });

  // ═══════════════════════════════════════════
  // presence:get
  // ═══════════════════════════════════════════
  socket.on("presence:get", (data) => {
    const userIds = data?.userIds;
    if (!Array.isArray(userIds) || userIds.length > 100) return;

    const presenceMap = {};
    for (const id of userIds) {
      presenceMap[id] = onlineUsers.has(id);
    }
    socket.emit("presence:list", presenceMap);
  });

  // ═══════════════════════════════════════════
  // chat:send
  // ═══════════════════════════════════════════
  socket.on("chat:send", async (data) => {
    try {
      const { receiverId, content, messageType, mediaUrl, bookingId } = data;

      if (!receiverId || !content) {
        return socket.emit("chat:error", {
          message: "receiverId and content required",
        });
      }

      logger.info(`📤 chat:send from ${userId} to ${receiverId}`);

      const result = await sendMessage(
        userId,
        receiverId,
        { content, messageType, mediaUrl },
        bookingId
      );

      io.to(`user:${receiverId}`).emit("chat:new-message", result);
      socket.emit("chat:message-sent", result);
    } catch (error) {
      logger.error(`❌ chat:send error: ${error.message}`);
      socket.emit("chat:error", { message: error.message });
    }
  });

  // ═══════════════════════════════════════════
  // chat:read / chat:mark-read
  // ═══════════════════════════════════════════
  const handleMarkRead = async (data) => {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      await markMessagesAsRead(conversationId, userId);
      const conversation = await getConversationById(conversationId);

      if (conversation) {
        const otherUserId =
          conversation.participant1Id === userId
            ? conversation.participant2Id
            : conversation.participant1Id;

        io.to(`user:${otherUserId}`).emit("chat:read", {
          conversationId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error(`❌ chat:mark-read error: ${error.message}`);
    }
  };

  socket.on("chat:mark-read", handleMarkRead);
  socket.on("chat:read", handleMarkRead);

  // ═══════════════════════════════════════════
  // chat:typing
  // ═══════════════════════════════════════════
  socket.on("chat:typing", (data) => {
    const { conversationId, isTyping, receiverId } = data || {};
    if (!conversationId || !receiverId) return;

    socket.to(`user:${receiverId}`).emit("chat:typing", {
      conversationId,
      userId,
      isTyping: !!isTyping,
    });
  });

  // ═══════════════════════════════════════════
  // Disconnect
  // ═══════════════════════════════════════════
  socket.on("disconnect", (reason) => {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        broadcastPresence(userId, false);
      }
    }
    logger.info(`❌ Socket disconnected: ${socket.id} | reason: ${reason}`);
  });
});

app.set("io", io);

export const getIO = () => io;

export { server, io, onlineUsers };