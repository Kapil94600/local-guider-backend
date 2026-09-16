// src/config/database.js
import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// ✅ Production me DATABASE_URL (Neon) use karo
// Local dev me individual fields use karo (fallback)
const sequelize = env.DATABASE_URL
  ? new Sequelize(env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Neon ke liye zaroori
        },
      },
      pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
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
        pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
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