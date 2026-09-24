// src/config/redis.js
import Redis from "ioredis";
import { env } from "./env.js";

let redis = null;
let isRedisAvailable = false;

const REDIS_HOST = env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(env.REDIS_PORT, 10) || 6379;
const REDIS_PASSWORD = env.REDIS_PASSWORD || undefined;

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
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 10000,
    retryStrategy(times) {
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
      return Math.min(times * 200, 5000);
    },
  };

  if (isTLS) {
    redisConfig.tls = { rejectUnauthorized: false };
  }

  redis = new Redis(redisConfig);

  redis.on("connect", () => {
    isRedisAvailable = true;
    console.log(`✅ Redis Connected (${isTLS ? "TLS" : "Plain"})`);
  });

  redis.on("ready", () => {
    isRedisAvailable = true;
    console.log("✅ Redis Ready");
  });

  redis.on("error", () => {
    if (!isRedisAvailable) isRedisAvailable = false;
  });

  redis.on("close", () => {
    isRedisAvailable = false;
  });

  redis.connect().catch(() => {
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
// SAFE GET
// ═══════════════════════════════════════════════════════════════
export const redisGet = async (key) => {
  if (!redis || !isRedisAvailable) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// SAFE SET
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// SAFE DEL
// ═══════════════════════════════════════════════════════════════
export const redisDel = async (key) => {
  if (!redis || !isRedisAvailable) return false;
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// SAFE INCR
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: SAFE EXPIRE
// ═══════════════════════════════════════════════════════════════
export const redisExpire = async (key, seconds) => {
  if (!redis || !isRedisAvailable) return false;
  try {
    await redis.expire(key, seconds);
    return true;
  } catch {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: RAW COMMAND (for rate-limit-redis)
// ═══════════════════════════════════════════════════════════════
export const redisCall = async (...args) => {
  if (!redis || !isRedisAvailable) {
    throw new Error("Redis not available");
  }
  return redis.call(...args);
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: Check availability
// ═══════════════════════════════════════════════════════════════
export const isRedisConnected = () => isRedisAvailable;

export default redis;