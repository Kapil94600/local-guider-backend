// src/config/database.js
import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// ⚡ Shared pool config
const poolConfig = {
  max: 20,
  min: 5,           // ✅ 5 warm connections — cold start avoid
  acquire: 30000,
  idle: 10000,
  evict: 15000,
};

// ✅ Production me DATABASE_URL (Neon), local dev me individual fields
const sequelize = env.DATABASE_URL
  ? new Sequelize(env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Neon
        },
        // ⚡ Neon ke liye keepAlive
        keepAlive: true,
      },
      pool: poolConfig,
      retry: {
        max: 3,
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
        logging: false,
        pool: poolConfig,
      }
    );

export { sequelize };

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info("✅ PostgreSQL Connected");
    console.log("✅ PostgreSQL Connected");
  } catch (error) {
    logger.error(`❌ Database Connection Error: ${error.message}`);
    console.error("❌ Database Connection Error");
    console.error(error.message);
    process.exit(1);
  }
};