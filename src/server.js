// src/server.js
import { server } from "./socket.js";
import { env } from "./config/env.js";
import { connectDB, sequelize } from "./config/database.js";
import "./database/models/index.js";
import { startCronJobs } from "./config/cron.js";
import { verifyEmailTransport } from "./utils/emailService.js";
import { logger } from "./utils/logger.js";
import "./database/models/index.js";

const startServer = async () => {
  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Connect to DB
    // ═══════════════════════════════════════════════════════════
    logger.info("1️⃣ Connecting to DB...");
    await connectDB();
    logger.info("2️⃣ DB Connected");

    // ═══════════════════════════════════════════════════════════
    // ✅ FIX B-16: NO sequelize.sync in production
    // Use migrations instead (npm run migrate or sequelize-cli)
    // ═══════════════════════════════════════════════════════════
    if (env.NODE_ENV === "development") {
      logger.info("3️⃣ Syncing tables (DEV only)...");
      await sequelize.sync();
      logger.info("4️⃣ Tables Synced (DEV)");
    } else {
      logger.info("3️⃣ Skipping sync (PROD — use migrations)");
      // ✅ Verify connection + schema availability
      await sequelize.authenticate();
      logger.info("4️⃣ DB Authenticated (PROD)");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Verify email transport (non-blocking)
    // ═══════════════════════════════════════════════════════════
    verifyEmailTransport()
      .then((ok) => {
        if (ok) logger.info("✅ Email transport verified");
        else logger.warn("⚠️ Email transport NOT verified");
      })
      .catch((e) => logger.error(`Email transport error: ${e.message}`));

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Start cron jobs
    // ═══════════════════════════════════════════════════════════
    logger.info("5️⃣ Starting Cron Jobs...");
    startCronJobs();

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Start HTTP server
    // ═══════════════════════════════════════════════════════════
    logger.info("6️⃣ Starting server...");
    server.listen(env.PORT, () => {
      logger.info(`🚀 Local Guider API running on port ${env.PORT}`);
      logger.info(`   Environment: ${env.NODE_ENV}`);
      logger.info(`   Allowed origins: ${(env.CORS_ORIGIN || []).join(", ")}`);
    });
  } catch (error) {
    logger.error(`❌ Startup error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
};

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════
const shutdown = (signal) => {
  logger.info(`🔴 ${signal} received — shutting down gracefully...`);

  server.close(async () => {
    logger.info("   HTTP server closed");

    try {
      await sequelize.close();
      logger.info("   DB connection closed");
    } catch (e) {
      logger.error(`   DB close error: ${e.message}`);
    }

    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    logger.error("   ⚠️ Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ═══════════════════════════════════════════════════════════════
// UNCAUGHT EXCEPTIONS
// ═══════════════════════════════════════════════════════════════
process.on("uncaughtException", (err) => {
  logger.error(`❌ Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  // In production: alert Sentry / monitoring
  // Then gracefully shutdown
  if (env.NODE_ENV === "production") {
    shutdown("uncaughtException");
  }
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`❌ Unhandled Rejection at: ${promise}`);
  logger.error(`   Reason: ${reason?.message || reason}`);
});

startServer();