import express from "express";
import {
  register,
  login,
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  googleLogin,
  forgotPassword,
  resetPassword,
} from "./auth.controller.js";
import { registerValidation, loginValidation } from "./auth.validation.js";
import { authLimiter } from "../../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/register", authLimiter, registerValidation, register);
router.post("/login", authLimiter, loginValidation, login);
router.post("/send-otp", authLimiter, sendOtp);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/google-login", authLimiter, googleLogin);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;