import Redis from "ioredis";
import { env } from "./env.js";

const redis = new Redis({
  host: env.REDIS_HOST || "127.0.0.1",
  port: env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

redis.on("connect", () => console.log("✅ Redis Connected"));
redis.on("error", (err) => console.error("❌ Redis Error:", err.message));

export default redis;