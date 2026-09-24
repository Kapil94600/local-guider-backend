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
import { otpRateLimiter } from "../../middlewares/otpRateLimiter.js"; // ✅ NEW
import { authenticate } from "../../middlewares/authMiddleware.js";  // ✅ NEW

const router = express.Router();

// ═══════════════════════════════════════════
// Email/Password
// ═══════════════════════════════════════════
router.post("/register", authLimiter, registerValidation, register);
router.post("/login", authLimiter, loginValidation, login);

// ═══════════════════════════════════════════
// DEV OTP — with per-phone limiter
// ═══════════════════════════════════════════
router.post("/send-otp", authLimiter, otpRateLimiter, sendOtp);  // ✅ otpRateLimiter added
router.post("/verify-otp", authLimiter, verifyOtp);

// ═══════════════════════════════════════════
// Firebase Phone Auth (PRODUCTION)
// ═══════════════════════════════════════════
router.post("/firebase-login", authLimiter, firebaseLogin);

// ═══════════════════════════════════════════
// Tokens
// ═══════════════════════════════════════════
router.post("/refresh-token", authLimiter, refreshToken);
router.post("/logout", authLimiter, authenticate, logout);  // ✅ authenticate added

// ═══════════════════════════════════════════
// Google
// ═══════════════════════════════════════════
router.post("/google-login", authLimiter, googleLogin);

// ═══════════════════════════════════════════
// Password reset
// ═══════════════════════════════════════════
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);

export default router;