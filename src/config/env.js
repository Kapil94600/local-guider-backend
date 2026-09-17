// src/config/env.js
import dotenv from "dotenv";
dotenv.config();

export const env = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "access_secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "1d",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || "30d",

  // CORS & API
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(",") || [
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  API_BASE_URL: process.env.BASE_URL || process.env.API_BASE_URL || "http://localhost:5000",

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,

  // SMTP (Email)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: process.env.REDIS_PORT || 6379,

  // Firebase Admin
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
  FIREBASE_CLIENT_CERT_URL: process.env.FIREBASE_CLIENT_CERT_URL,
};