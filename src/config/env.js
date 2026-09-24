// src/config/env.js
import dotenv from "dotenv";
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

const REQUIRED_IN_PROD = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "DATABASE_URL",
  "CORS_ORIGIN",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

if (isProd) {
  const missing = REQUIRED_IN_PROD.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      "❌ Missing required env vars in production:",
      missing.join(", ")
    );
    process.exit(1);
  }
}

const DB_SSL_MODE =
  process.env.DB_SSL_MODE || (isProd ? "require" : "disable");

export const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV,

  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_SSL_MODE,

  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ||
    (isProd ? undefined : "dev_access_secret_change_me"),
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    (isProd ? undefined : "dev_refresh_secret_change_me"),
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "1d",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || "30d",

  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(",") || [
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  API_BASE_URL:
    process.env.BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:5000",

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  FROM_EMAIL: process.env.FROM_EMAIL || process.env.SMTP_USER,
  FROM_NAME: process.env.FROM_NAME || "Local Guider",

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_TLS: process.env.REDIS_TLS === "true",

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
  FIREBASE_CLIENT_CERT_URL: process.env.FIREBASE_CLIENT_CERT_URL,
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT,

  // ✅ NEW: Expo Push access token (recommended for reliability)
  EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN,

  // ✅ NEW: Google Maps API key
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,

  LOG_LEVEL: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),

  RATE_LIMIT_WINDOW_MS:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
};