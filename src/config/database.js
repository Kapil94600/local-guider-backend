// src/config/database.js
import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const dbHost = env.DB_HOST || "localhost";
const dbPort = parseInt(env.DB_PORT, 10) || 5432;

export const sequelize = new Sequelize(
  env.DB_NAME,
  env.DB_USER,
  env.DB_PASSWORD,
  {
    host: dbHost,
    port: dbPort,
    dialect: "postgres",
    logging: false,
    pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
  }
);

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