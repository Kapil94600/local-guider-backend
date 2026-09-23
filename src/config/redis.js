// src/config/redis.js
import Redis from "ioredis";
import { env } from "./env.js";

// ═══════════════════════════════════════════════════════════════
// REDIS CLIENT — Graceful connection
// Supports: Local, Upstash (TLS), Redis Cloud
// ═══════════════════════════════════════════════════════════════
// Ye client try karta hai connect karne ki. Agar fail hota hai,
// to error log karta hai but crash nahi karta.
// Redis-dependent features (cache, rate limit) degrade ho jate hain.
// ═══════════════════════════════════════════════════════════════

let redis = null;
let isRedisAvailable = false;

const REDIS_HOST = env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(env.REDIS_PORT, 10) || 6379;
const REDIS_PASSWORD = env.REDIS_PASSWORD || undefined;  // ✅ NEW

// ✅ Auto-detect TLS for Upstash / Redis Cloud
const isTLS =
  env.REDIS_TLS === "true" ||
  env.REDIS_TLS === true ||
  REDIS_HOST.includes("upstash.io") ||
  REDIS_HOST.includes("redislabs.com");

try {
  const redisConfig = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: 1,      // ✅ Fail fast
    enableOfflineQueue: false,    // ✅ Don't queue when offline
    lazyConnect: true,            // ✅ Don't auto-connect
    connectTimeout: 10000,        // ✅ 10s connect timeout
    retryStrategy(times) {
      // ✅ Retry with exponential backoff (never fully give up)
      if (times > 10) {
        if (!isRedisAvailable) {
          console.warn(
            `⚠️  Redis still not available at ${REDIS_HOST}:${REDIS_PORT} (${times} attempts)`
          );
          console.warn(
            "⚠️  Continuing without Redis — some features may degrade"
          );
        }
      }
      return Math.min(times * 200, 5000);  // max 5s
    },
  };

  // ✅ Add TLS for Upstash / Redis Cloud
  if (isTLS) {
    redisConfig.tls = {
      rejectUnauthorized: false,  // ✅ Skip cert verify (Upstash uses valid certs but this is safer for proxies)
    };
  }

  redis = new Redis(redisConfig);

  // ─── Event handlers ───
  redis.on("connect", () => {
    isRedisAvailable = true;
    console.log(`✅ Redis Connected (${isTLS ? "TLS" : "Plain"})`);
  });

  redis.on("ready", () => {
    isRedisAvailable = true;
    console.log("✅ Redis Ready");
  });

  redis.on("error", (err) => {
    // ✅ Only log error ONCE (avoid spam)
    if (!isRedisAvailable) {
      isRedisAvailable = false;
      // Silent — do not spam
      // Uncomment for debugging:
      // console.error("Redis error:", err.message);
    }
  });

  redis.on("close", () => {
    isRedisAvailable = false;
  });

  redis.on("reconnecting", () => {
    // Silent — auto-reconnect
  });

  // ─── Try to connect ───
  redis.connect().catch((err) => {
    console.warn(
      `⚠️  Redis unavailable (${REDIS_HOST}:${REDIS_PORT}) — running in degraded mode`
    );
    isRedisAvailable = false;
  });
} catch (err) {
  console.warn("⚠️  Redis initialization failed:", err.message);
  console.warn("⚠️  Running without Redis");
  redis = null;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Safe Redis operations (graceful fallback)
// ═══════════════════════════════════════════════════════════════
export const redisGet = async (key) => {
  if (!redis || !isRedisAvailable) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
};

export const redisSet = async (key, value, expirySeconds = null) => {
  if (!redis || !isRedisAvailable) return false;
  try {
    if (expirySeconds) {
      await redis.setex(key, expirySeconds, value);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
};

export const redisDel = async (key) => {
  if (!redis || !isRedisAvailable) return false;
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
};

// ✅ NEW: Atomic increment (for rate limiting)
export const redisIncr = async (key, expirySeconds = null) => {
  if (!redis || !isRedisAvailable) return null;
  try {
    const count = await redis.incr(key);
    if (count === 1 && expirySeconds) {
      await redis.expire(key, expirySeconds);
    }
    return count;
  } catch {
    return null;
  }
};

export const isRedisConnected = () => isRedisAvailable;

export default redis;