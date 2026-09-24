// src/middlewares/userRateLimiter.js
import { redisGet, redisSet, redisIncr } from "../config/redis.js";
import { logger } from "../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// PER-USER RATE LIMITING (Redis-backed with memory fallback)
// ═══════════════════════════════════════════════════════════════
const memoryStore = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt < now) memoryStore.delete(key);
  }
}, 5 * 60 * 1000);

if (cleanupInterval.unref) cleanupInterval.unref();

export const stopRateLimiterCleanup = () => clearInterval(cleanupInterval);

export const userRateLimit = ({ windowMs = 60000, max = 30 } = {}) => {
  return async (req, res, next) => {
    try {
      const identifier = req.user?.id
        ? `user:${req.user.id}`
        : `ip:${req.ip}`;

      const windowSec = Math.ceil(windowMs / 1000);
      const key = `ratelimit:${identifier}:${Math.floor(
        Date.now() / windowMs
      )}`;

      let count = 0;

      // Try Redis first
      const redisCount = await redisIncr(key, windowSec);

      if (redisCount !== null) {
        count = redisCount;
      } else {
        // Fallback: in-memory
        const now = Date.now();
        const entry = memoryStore.get(key);

        if (!entry || entry.expiresAt < now) {
          memoryStore.set(key, {
            count: 1,
            expiresAt: now + windowMs,
          });
          count = 1;
        } else {
          entry.count++;
          count = entry.count;
        }
      }

      res.set("X-RateLimit-Limit", max.toString());
      res.set("X-RateLimit-Remaining", Math.max(0, max - count).toString());

      if (count > max) {
        logger.warn(
          `⚠️ Rate limit hit: ${identifier} — ${count}/${max} in ${windowMs}ms`
        );
        return res.status(429).json({
          success: false,
          message: `Too many requests. Please wait ${Math.ceil(
            windowMs / 1000
          )}s.`,
        });
      }

      next();
    } catch (error) {
      logger.error(`Rate limiter error: ${error.message}`);
      next();
    }
  };
};

export default userRateLimit;