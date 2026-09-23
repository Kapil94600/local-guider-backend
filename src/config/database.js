// src/config/database.js
import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// ⚡ Shared pool config
// ═══════════════════════════════════════════════════════════════
const poolConfig = {
  max: 20,
  min: 5,           // ✅ 5 warm connections
  acquire: 60000,   // ✅ 60s to acquire
  idle: 10000,      // 10s idle timeout
  evict: 15000,     // 15s eviction check
};

// ═══════════════════════════════════════════════════════════════
// ✅ SSL config based on DB_SSL_MODE
// ═══════════════════════════════════════════════════════════════
const getSslConfig = () => {
  const mode = env.DB_SSL_MODE;

  if (mode === "disable") return false;

  if (mode === "require") {
    // ⚠️ Encrypts but doesn't verify cert. Better than nothing.
    return {
      require: true,
      rejectUnauthorized: false,
    };
  }

  // "verify-ca" or "verify-full" — full verification (recommended for prod)
  return {
    require: true,
    rejectUnauthorized: true,
  };
};

// ═══════════════════════════════════════════════════════════════
// ✅ Production (Neon) — DATABASE_URL
// ✅ Local dev — individual fields
// ═══════════════════════════════════════════════════════════════
const sequelize = env.DATABASE_URL
  ? new Sequelize(env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        ssl: getSslConfig(), // ✅ Dynamic SSL
        keepAlive: true,     // ⚡ Neon ke liye
      },
      pool: poolConfig,
      retry: {
        max: 3,
      },
      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true,
      },
    })
  : new Sequelize(
      env.DB_NAME,
      env.DB_USER,
      env.DB_PASSWORD,
      {
        host: env.DB_HOST || "localhost",
        port: parseInt(env.DB_PORT, 10) || 5432,
        dialect: "postgres",
        logging: env.NODE_ENV === "development" ? console.log : false,
        pool: poolConfig,
        define: {
          timestamps: true,
          underscored: false,
          freezeTableName: true,
        },
      }
    );

export { sequelize };

// ═══════════════════════════════════════════════════════════════
// CONNECT — with retry
// ═══════════════════════════════════════════════════════════════
export const connectDB = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info("✅ PostgreSQL Connected");
      console.log("✅ PostgreSQL Connected");
      return;
    } catch (error) {
      logger.error(
        `❌ DB Connection Error (attempt ${attempt}/${retries}): ${error.message}`
      );
      console.error(
        `❌ DB Connection Error (attempt ${attempt}/${retries}):`,
        error.message
      );

      if (attempt === retries) {
        console.error("❌ All DB connection attempts failed");
        process.exit(1);
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`   Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};