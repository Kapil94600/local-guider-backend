// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../database/models/core/User.js";
import { isUserBlocked } from "../modules/blocks/block.repository.js";

// ═══════════════════════════════════════════════════════════════
// ✅ BLOCK CACHE — 30s TTL, prevents DB hit on every request
// ═══════════════════════════════════════════════════════════════
const blockCache = new Map(); // userId -> { blocked, expiresAt }
const BLOCK_CACHE_TTL = 30 * 1000; // 30 seconds

const getBlockStatus = async (userId) => {
  const now = Date.now();
  const cached = blockCache.get(userId);

  if (cached && cached.expiresAt > now) {
    return cached.blocked;
  }

  const blocked = await isUserBlocked(userId);
  blockCache.set(userId, { blocked, expiresAt: now + BLOCK_CACHE_TTL });
  return blocked;
};

// ✅ Export so admin block/unblock can invalidate cache
export const clearBlockCache = (userId) => {
  if (userId) {
    blockCache.delete(userId);
  } else {
    blockCache.clear();
  }
};

// Periodic cleanup of expired entries (memory leak prevention)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of blockCache.entries()) {
    if (value.expiresAt < now) blockCache.delete(key);
  }
}, 60 * 1000); // every 60s

// ═══════════════════════════════════════════════════════════════
// ✅ AUTHENTICATE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];

    // ── Verify JWT ──
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // ✅ Sanity: token must have id
    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ✅ PARALLEL: user fetch + block check (was sequential)
    // ═══════════════════════════════════════════════════════════
    const [dbUser, blocked] = await Promise.all([
      User.findByPk(decoded.id, {
        attributes: ["id", "role", "isActive", "accountStatus"],
      }),
      getBlockStatus(decoded.id),
    ]);

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // ── Status checks ──
    if (!dbUser.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    if (dbUser.accountStatus === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message: "Account is blocked",
      });
    }

    if (dbUser.accountStatus === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        message: "Account is suspended",
      });
    }

    // ── Admin-block check (cached) ──
    if (blocked) {
      return res.status(403).json({
        success: false,
        message: "You have been blocked by an admin",
      });
    }

    // ✅ Override role from DB (fresh, not from stale token)
    req.user = {
      ...decoded,
      id: dbUser.id, // ✅ guaranteed
      role: dbUser.role,
    };

    next();
  } catch (error) {
    console.error("❌ authenticate error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ OPTIONAL AUTH — for public routes that want user context
// (e.g., reviews, favorites — show user-specific data if logged in)
// ═══════════════════════════════════════════════════════════════
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No auth → continue without user
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      // Invalid token → continue without user
      req.user = null;
      return next();
    }

    if (!decoded?.id) {
      req.user = null;
      return next();
    }

    const [dbUser, blocked] = await Promise.all([
      User.findByPk(decoded.id, {
        attributes: ["id", "role", "isActive", "accountStatus"],
      }),
      getBlockStatus(decoded.id),
    ]);

    if (!dbUser || !dbUser.isActive || blocked) {
      req.user = null;
      return next();
    }

    if (
      dbUser.accountStatus === "BLOCKED" ||
      dbUser.accountStatus === "SUSPENDED"
    ) {
      req.user = null;
      return next();
    }

    req.user = {
      ...decoded,
      id: dbUser.id,
      role: dbUser.role,
    };

    next();
  } catch (error) {
    // Any error → continue without user
    req.user = null;
    next();
  }
};