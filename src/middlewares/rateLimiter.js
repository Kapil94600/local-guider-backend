// src/middlewares/rateLimiter.js
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisCall, isRedisConnected } from "../config/redis.js";
import { logger } from "../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// HELPER: Create store (Redis if available, else default memory)
// ═══════════════════════════════════════════════════════════════
const createStore = (prefix) => {
  if (!isRedisConnected()) {
    logger.warn(
      `⚠️  Rate limiter "${prefix}" using in-memory store (multi-instance will fail)`
    );
    return undefined; // default MemoryStore
  }

  try {
    return new RedisStore({
      sendCommand: (...args) => redisCall(...args),
      prefix: `rl:${prefix}:`,
    });
  } catch (err) {
    logger.error(`Rate limiter Redis store failed: ${err.message}`);
    return undefined;
  }
};

// ═══════════════════════════════════════════════════════════════
// AUTH LIMITER — login/signup/OTP endpoints
// ═══════════════════════════════════════════════════════════════
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("auth"),
  message: {
    success: false,
    message: "Too many attempts, try again later",
  },
});

// ═══════════════════════════════════════════════════════════════
// API LIMITER — general API
// ═══════════════════════════════════════════════════════════════
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("api"),
  message: {
    success: false,
    message: "Too many requests, slow down",
  },
});

export default { authLimiter, apiLimiter };