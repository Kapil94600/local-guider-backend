// src/modules/auth/auth.routes.js
import express from "express";
import {
  register,
  login,
  sendOtp,
  verifyOtp,
  firebaseLogin,
  refreshToken,
  logout,
  googleLogin,
  forgotPassword,
  resetPassword,
} from "./auth.controller.js";
import { registerValidation, loginValidation } from "./auth.validation.js";
import { authLimiter } from "../../middlewares/rateLimiter.js";

const router = express.Router();

// ═══════════════════════════════════════════
// Email/Password
// ═══════════════════════════════════════════
router.post("/register", authLimiter, registerValidation, register);
router.post("/login", authLimiter, loginValidation, login);

// ═══════════════════════════════════════════
// DEV OTP (console only — testing)
// ═══════════════════════════════════════════
router.post("/send-otp", authLimiter, sendOtp);
router.post("/verify-otp", authLimiter, verifyOtp);

// ═══════════════════════════════════════════
// Firebase Phone Auth (PRODUCTION)
// ═══════════════════════════════════════════
router.post("/firebase-login", authLimiter, firebaseLogin);

// ═══════════════════════════════════════════
// ✅ FIX: Add rate limiters to token routes
// ═══════════════════════════════════════════
router.post("/refresh-token", authLimiter, refreshToken);
router.post("/logout", authLimiter, logout);

// ═══════════════════════════════════════════
// Google
// ═══════════════════════════════════════════
router.post("/google-login", authLimiter, googleLogin);

// ═══════════════════════════════════════════
// ✅ FIX: Password reset with rate limits
// ═══════════════════════════════════════════
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);

export default router;