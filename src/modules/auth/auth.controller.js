import { ApiResponse } from "../../utils/apiResponse.js";
import {
  registerUser,
  loginUser,
  sendOtpService,
  verifyOtpService,
  verifyFirebaseTokenService,
  refreshUserToken,
  logoutUser,
  forgotPasswordService,
  resetPasswordService,
  googleLoginService,
} from "./auth.service.js";

// ═══════════════════════════════════════════
// ✅ Register
// ═══════════════════════════════════════════
export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    return ApiResponse.success(res, "User registered successfully", result);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ Login
// ═══════════════════════════════════════════
export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body.email, req.body.password);
    return ApiResponse.success(res, "Login successful", result);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ Send OTP (DEV — console only)
// ═══════════════════════════════════════════
export const sendOtp = async (req, res, next) => {
  try {
    const result = await sendOtpService(req.body.phone);
    return ApiResponse.success(res, "OTP sent successfully", result);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ Verify OTP (DEV)
// ═══════════════════════════════════════════
export const verifyOtp = async (req, res, next) => {
  try {
    const result = await verifyOtpService(req.body.phone, req.body.otp);
    return ApiResponse.success(res, "Login successful", result);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// 🔥 Firebase Phone Auth Login (PRODUCTION)
// ═══════════════════════════════════════════
export const firebaseLogin = async (req, res, next) => {
  try {
    const result = await verifyFirebaseTokenService(req.body.idToken);
    return ApiResponse.success(res, "Login successful", result);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ Refresh Token
// ═══════════════════════════════════════════
export const refreshToken = async (req, res, next) => {
  try {
    const result = await refreshUserToken(req.body.refreshToken);
    return ApiResponse.success(res, "Token refreshed successfully", result);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ Logout
// ═══════════════════════════════════════════
export const logout = async (req, res, next) => {
  try {
    const result = await logoutUser(req.body.refreshToken);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ Google Login
// ═══════════════════════════════════════════
export const googleLogin = async (req, res, next) => {
  try {
    const result = await googleLoginService(req.body);
    return ApiResponse.success(res, "Google login successful", result);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ Forgot Password
// ═══════════════════════════════════════════
export const forgotPassword = async (req, res, next) => {
  try {
    const result = await forgotPasswordService(req.body.email);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ Reset Password
// ═══════════════════════════════════════════
export const resetPassword = async (req, res, next) => {
  try {
    const result = await resetPasswordService(
      req.params.token,
      req.body.newPassword
    );
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};