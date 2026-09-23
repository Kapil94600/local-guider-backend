// src/middlewares/userRateLimiter.js
import { redisGet, redisSet } from "../config/redis.js";
import { logger } from "../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// ✅ FEATURE B-24: Per-USER rate limiting (Redis-backed)
// Falls back to in-memory if Redis unavailable
// ═══════════════════════════════════════════════════════════════

// In-memory fallback store
const memoryStore = new Map();

// Cleanup expired entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt < now) memoryStore.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Usage:
 *   router.post('/expensive', authenticate, userRateLimit({ windowMs: 60000, max: 10 }), handler)
 */
export const userRateLimit = ({ windowMs = 60000, max = 30 } = {}) => {
  return async (req, res, next) => {
    try {
      // ✅ Fallback to IP if no user
      const identifier = req.user?.id
        ? `user:${req.user.id}`
        : `ip:${req.ip}`;

      const windowSec = Math.ceil(windowMs / 1000);
      const key = `ratelimit:${identifier}:${Math.floor(
        Date.now() / windowMs
      )}`;

      let count = 0;

      // ── Try Redis first
      try {
        const current = await redisGet(key);
        count = current ? parseInt(current, 10) : 0;
        count++;
        await redisSet(key, count.toString(), windowSec);
      } catch (e) {
        // Redis unavailable — use in-memory
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

      // Set headers
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
      // ✅ Never block on rate limiter errors
      logger.error(`Rate limiter error: ${error.message}`);
      next();
    }
  };
};

export default userRateLimit;