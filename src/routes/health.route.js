// src/routes/health.route.js
import express from "express";
import { sequelize } from "../config/database.js";
import redis from "../config/redis.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/health
// Returns server + DB + Redis status
// ═══════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  const startTime = Date.now();

  const health = {
    status: "healthy",
    uptime: formatUptime(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    services: {
      database: "unknown",
      redis: "unknown",
    },
  };

  // ─── DATABASE CHECK ───
  try {
    await sequelize.authenticate();
    health.services.database = "connected";
  } catch (err) {
    health.services.database = "disconnected";
    health.status = "degraded";
  }

  // ─── REDIS CHECK (graceful) ───
  try {
    if (redis && typeof redis.ping === "function") {
      const pong = await redis.ping();
      health.services.redis = pong === "PONG" ? "connected" : "degraded";
    } else {
      // ✅ Redis not configured — not a blocker
      health.services.redis = "not_configured";
    }
  } catch (err) {
    health.services.redis = "disconnected";
    // ✅ Do NOT mark overall as unhealthy — Redis is optional
  }

  // ─── Overall status ───
  if (health.services.database === "disconnected") {
    health.status = "unhealthy";
  }

  const latency = Date.now() - startTime;
  health.latency = `${latency}ms`;

  // Return 200 for healthy/degraded, 503 for unhealthy
  const statusCode = health.status === "unhealthy" ? 503 : 200;
  return res.status(statusCode).json(health);
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Format uptime
// ═══════════════════════════════════════════════════════════════
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

export default router;