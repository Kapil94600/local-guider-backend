// src/config/env.js
import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // ✅ NEW: Neon DATABASE_URL (production)
  DATABASE_URL: process.env.DATABASE_URL,

  // Local DB (fallback for development)
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "access_secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "1d",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || "30d",

  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173", "http://localhost:3000"],
  API_BASE_URL: process.env.BASE_URL || "http://localhost:5000",

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,

  MSG91_API_KEY: process.env.MSG91_API_KEY,
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID,
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID,

  FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY,
  FAST2SMS_SENDER_ID: process.env.FAST2SMS_SENDER_ID || "FSTSMS",

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE: process.env.TWILIO_PHONE,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: process.env.REDIS_PORT || 6379,

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "localguider-a84f3",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@localguider-a84f3.iam.gserviceaccount.com",
};