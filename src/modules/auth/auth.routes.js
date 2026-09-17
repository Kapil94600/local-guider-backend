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
// 📱 DEV OTP (console only — testing)
// ═══════════════════════════════════════════
router.post("/send-otp", authLimiter, sendOtp);
router.post("/verify-otp", authLimiter, verifyOtp);

// ═══════════════════════════════════════════
// 🔥 Firebase Phone Auth (PRODUCTION)
// ═══════════════════════════════════════════
router.post("/firebase-login", authLimiter, firebaseLogin);

// ═══════════════════════════════════════════
// Token Management
// ═══════════════════════════════════════════
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// ═══════════════════════════════════════════
// Google
// ═══════════════════════════════════════════
router.post("/google-login", authLimiter, googleLogin);

// ═══════════════════════════════════════════
// Password Reset
// ═══════════════════════════════════════════
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;