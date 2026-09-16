import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  createUser,
  createWallet,
  saveRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
  findUserByResetToken,
} from "./auth.repository.js";
import { findUserByGoogleId } from "./auth.repository.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./token.service.js";
import { sendEmail } from "../../utils/emailService.js";
import { sendSms } from "../../utils/smsService.js";
import { env } from "../../config/env.js";

const otpStore = new Map();

// ✅ Register
export const registerUser = async (payload) => {
  const existingUser = await findUserByEmail(payload.email);
  if (existingUser) throw new Error("User already exists");
  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const user = await createUser({
    firstName: payload.firstName,
    lastName: payload.lastName || null,
    email: payload.email,
    phone: payload.phone,
    passwordHash: hashedPassword,
    role: "USER",
  });
  await createWallet(user.id);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await saveRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return { user, accessToken, refreshToken };
};

// ✅ Login
export const loginUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("Invalid credentials");
  if (!user.passwordHash) throw new Error("Password login not available for this account");
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error("Invalid credentials");
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await saveRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return { user, accessToken, refreshToken };
};

// ✅ Send OTP (Console Only - Testing Mode)
export const sendOtpService = async (phone) => {
  if (!phone) throw new Error("Phone number is required");
  const cleanPhone = phone.trim();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(cleanPhone, otp);

  // ❌ Real SMS DISABLED (testing ke liye)
  // sendSms({ to: cleanPhone, body: `Your OTP is ${otp}` }).catch(console.error);

  // ✅ OTP Console me print karo (testing)
  console.log("🔑 OTP (Testing):", otp, "for phone:", cleanPhone);
  console.log("📌 Verify OTP:", otp, "using phone:", cleanPhone);

  return { phone: cleanPhone };
};

// ✅ Verify OTP
export const verifyOtpService = async (phone, otp) => {
  if (!phone) throw new Error("Phone number is required");
  if (!otp) throw new Error("OTP is required");

  const cleanPhone = phone.trim();
  const cleanOtp = otp.trim();

  // 🔍 Debug - server console me dikhega
  console.log("🔍 Verify OTP Debug:");
  console.log("   Phone:", cleanPhone);
  console.log("   Received OTP:", cleanOtp);
  console.log("   Stored OTP:", otpStore.get(cleanPhone));

  const savedOtp = otpStore.get(cleanPhone);
  if (!savedOtp || savedOtp !== cleanOtp) throw new Error("Invalid OTP");

  let user = await findUserByPhone(cleanPhone);
  if (!user) {
    user = await createUser({
      firstName: "User",
      lastName: null,
      email: `${cleanPhone}@localguider.com`,
      phone: cleanPhone,
      passwordHash: null,
      role: "USER",
      isVerified: true,
      isActive: true,
      accountStatus: "ACTIVE",
      phoneVerifiedAt: new Date(),
    });
    await createWallet(user.id);
  }
  otpStore.delete(cleanPhone);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await saveRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  console.log("✅ User logged in:", user.id);
  return { user, accessToken, refreshToken };
};

// ✅ Refresh Token
export const refreshUserToken = async (refreshToken) => {
  const storedToken = await getRefreshToken(refreshToken);
  if (!storedToken) throw new Error("Invalid refresh token");
  const decoded = verifyRefreshToken(refreshToken);
  const user = await findUserById(decoded.id);
  if (!user) throw new Error("User not found");
  const accessToken = generateAccessToken(user);
  return { accessToken };
};

// ✅ Logout
export const logoutUser = async (refreshToken) => {
  if (!refreshToken) throw new Error("Refresh token is required");
  await revokeRefreshToken(refreshToken);
  return { message: "Logout successful" };
};

// ✅ Google Login
export const googleLoginService = async (payload) => {
  const { googleId, email, firstName, lastName, profileImage } = payload;
  let user = await findUserByGoogleId(googleId);
  if (!user) user = await findUserByEmail(email);
  if (!user) {
    user = await createUser({
      firstName,
      lastName,
      email,
      phone: null,
      passwordHash: null,
      googleId,
      provider: "GOOGLE",
      profileImage,
      role: "USER",
      isVerified: true,
      accountStatus: "ACTIVE",
    });
    await createWallet(user.id);
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await saveRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return { user, accessToken, refreshToken };
};

// ✅ Forgot Password
export const forgotPasswordService = async (email) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("User not found");
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  await user.update({ resetTokenHash: tokenHash, resetTokenExpires: new Date(Date.now() + 15 * 60 * 1000) });
  const resetUrl = `${env.API_BASE_URL}/api/v1/auth/reset-password/${resetToken}`;
  await sendEmail({ to: email, subject: "Password Reset", html: `<p>Click the link to reset your password:</p><a href="${resetUrl}">Reset Password</a>` });
  return { message: "Password reset email sent" };
};

// ✅ Reset Password
export const resetPasswordService = async (token, newPassword) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await findUserByResetToken(tokenHash);
  if (!user) throw new Error("Invalid or expired token");
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ passwordHash: hashedPassword, resetTokenHash: null, resetTokenExpires: null });
  return { message: "Password reset successful" };
};

// ✅ Firebase Token Verify Service (Baad me use hoga)
export const verifyFirebaseTokenService = async (idToken) => {
  // Firebase ka setup baad me hoga, isliye yeh function abhi ke liye yahi hai
  throw new Error("Firebase service not configured yet");
};