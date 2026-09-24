// src/middlewares/otpRateLimiter.js
// ═══════════════════════════════════════════════════════════════
// OTP RATE LIMITER — Redis-backed (multi-instance safe)
// 1-minute cooldown + 5 per 24h per phone
// ═══════════════════════════════════════════════════════════════
import { redisGet, redisSet, redisIncr, redisExpire } from "../config/redis.js";
import { logger } from "../utils/logger.js";

// Fallback in-memory store (if Redis unavailable)
const memoryStore = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt < now) memoryStore.delete(key);
  }
}, 5 * 60 * 1000);

if (cleanupInterval.unref) cleanupInterval.unref();

export const stopOtpRateLimiterCleanup = () =>
  clearInterval(cleanupInterval);

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const COOLDOWN_MS = 60 * 1000; // 1 minute
const DAILY_LIMIT = 5; // 5 per day
const DAY_MS = 24 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
export const otpRateLimiter = async (req, res, next) => {
  const phone = req.body.phone?.trim();
  if (!phone) return next();

  const now = Date.now();

  // ── Try Redis ──
  if (redisGet && redisIncr) {
    try {
      const cooldownKey = `otp:cooldown:${phone}`;
      const dailyKey = `otp:daily:${phone}`;

      // 1. Cooldown check (SET NX with TTL)
      const cooldown = await redisGet(cooldownKey);
      if (cooldown) {
        const remaining = Math.ceil(
          (COOLDOWN_MS - (now - parseInt(cooldown, 10))) / 1000
        );
        if (remaining > 0) {
          return res.status(429).json({
            success: false,
            message: `Please wait ${remaining} seconds before requesting new OTP`,
          });
        }
      }

      // 2. Daily counter
      const dailyCount = parseInt((await redisGet(dailyKey)) || "0", 10);
      if (dailyCount >= DAILY_LIMIT) {
        return res.status(429).json({
          success: false,
          message: "Daily OTP limit reached. Try again tomorrow.",
        });
      }

      // 3. Increment counters
      await redisSet(cooldownKey, String(now), Math.ceil(COOLDOWN_MS / 1000));
      const newCount = await redisIncr(dailyKey);

      // Set TTL on daily counter first time
      if (newCount === 1) {
        await redisExpire(dailyKey, Math.ceil(DAY_MS / 1000));
      }

      return next();
    } catch (err) {
      logger.error(`OTP rate limiter Redis error: ${err.message}`);
      // fall through to memory fallback
    }
  }

  // ── Fallback: in-memory ──
  const record = memoryStore.get(phone) || {
    lastSent: 0,
    dayCount: 0,
    dayStart: now,
    expiresAt: now + DAY_MS,
  };

  // Reset daily counter after 24h
  if (now - record.dayStart > DAY_MS) {
    record.dayCount = 0;
    record.dayStart = now;
  }

  // 1-min cooldown
  if (now - record.lastSent < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - record.lastSent)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Please wait ${wait} seconds before requesting new OTP`,
    });
  }

  // 5 per day limit
  if (record.dayCount >= DAILY_LIMIT) {
    return res.status(429).json({
      success: false,
      message: "Daily OTP limit reached. Try again tomorrow.",
    });
  }

  record.lastSent = now;
  record.dayCount += 1;
  record.expiresAt = now + DAY_MS;
  memoryStore.set(phone, record);

  next();
};

export default otpRateLimiter;