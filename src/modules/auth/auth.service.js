import bcrypt from "bcryptjs";
import crypto from "crypto";
import admin from "../../config/firebase.js";
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
import { env } from "../../config/env.js";

// In-memory OTP store (dev/testing ke liye)
const otpStore = new Map();

// ═══════════════════════════════════════════
// ✅ Register
// ═══════════════════════════════════════════
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

// ═══════════════════════════════════════════
// ✅ Login
// ═══════════════════════════════════════════
export const loginUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("Invalid credentials");
  if (!user.passwordHash)
    throw new Error("Password login not available for this account");
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

// ═══════════════════════════════════════════
// ✅ Send OTP — DEV MODE (console only, no SMS)
// ═══════════════════════════════════════════
export const sendOtpService = async (phone) => {
  if (!phone) throw new Error("Phone number is required");

  const cleanPhone = phone.trim();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(cleanPhone, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });

  // 🔑 OTP console pe print — testing ke liye
  console.log("");
  console.log("═══════════════════════════════════════");
  console.log("📱 Phone:", cleanPhone);
  console.log("🔑 OTP CODE:", otp);
  console.log("⏰ Expires in: 5 minutes");
  console.log("═══════════════════════════════════════");
  console.log("");

  return { phone: cleanPhone };
};

// ═══════════════════════════════════════════
// ✅ Verify OTP — DEV MODE
// ═══════════════════════════════════════════
export const verifyOtpService = async (phone, otp) => {
  if (!phone) throw new Error("Phone number is required");
  if (!otp) throw new Error("OTP is required");

  const cleanPhone = phone.trim();
  const cleanOtp = otp.trim();

  const record = otpStore.get(cleanPhone);
  if (!record) throw new Error("OTP not found. Please request new OTP.");

  // Expiry check
  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    throw new Error("OTP expired. Please request new OTP.");
  }

  // Attempts check
  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    otpStore.delete(cleanPhone);
    throw new Error("Too many attempts. Request new OTP.");
  }

  // Verify
  if (record.otp !== cleanOtp) {
    throw new Error("Invalid OTP");
  }

  otpStore.delete(cleanPhone);

  // User dhundo ya banao
  let user = await findUserByPhone(cleanPhone);
  if (!user) {
    user = await createUser({
      firstName: "User",
      lastName: null,
      email: `${cleanPhone.replace("+", "")}@localguider.com`,
      phone: cleanPhone,
      passwordHash: null,
      role: "USER",
      isVerified: true,
      isActive: true,
      accountStatus: "ACTIVE",
      phoneVerifiedAt: new Date(),
    });
    await createWallet(user.id);
    console.log("✅ New user created via OTP:", user.id);
  } else {
    console.log("✅ Existing user logged in via OTP:", user.id);
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

// ═══════════════════════════════════════════
// 🔥 Firebase Phone Auth — Production
// ═══════════════════════════════════════════
export const verifyFirebaseTokenService = async (idToken) => {
  if (!idToken) throw new Error("ID token is required");

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("❌ Firebase verify error:", error.message);
    throw new Error("Invalid or expired Firebase token");
  }

  const phone = decoded.phone_number;
  const firebaseUid = decoded.uid;

  if (!phone) throw new Error("Phone number not found in Firebase token");

  let user = await findUserByPhone(phone);

  if (!user) {
    user = await createUser({
      firstName: "User",
      lastName: null,
      email: `${phone.replace("+", "")}@localguider.com`,
      phone: phone,
      passwordHash: null,
      role: "USER",
      isVerified: true,
      isActive: true,
      accountStatus: "ACTIVE",
      phoneVerifiedAt: new Date(),
    });
    await createWallet(user.id);
    console.log("✅ New user created via Firebase:", user.id);
  } else {
    console.log("✅ Existing user logged in via Firebase:", user.id);
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

// ═══════════════════════════════════════════
// ✅ Refresh Token
// ═══════════════════════════════════════════
export const refreshUserToken = async (refreshToken) => {
  const storedToken = await getRefreshToken(refreshToken);
  if (!storedToken) throw new Error("Invalid refresh token");
  const decoded = verifyRefreshToken(refreshToken);
  const user = await findUserById(decoded.id);
  if (!user) throw new Error("User not found");
  const accessToken = generateAccessToken(user);
  return { accessToken };
};

// ═══════════════════════════════════════════
// ✅ Logout
// ═══════════════════════════════════════════
export const logoutUser = async (refreshToken) => {
  if (!refreshToken) throw new Error("Refresh token is required");
  await revokeRefreshToken(refreshToken);
  return { message: "Logout successful" };
};

// ═══════════════════════════════════════════
// ✅ Google Login
// ═══════════════════════════════════════════
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

// ═══════════════════════════════════════════
// ✅ Forgot Password
// ═══════════════════════════════════════════
export const forgotPasswordService = async (email) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("User not found");
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  await user.update({
    resetTokenHash: tokenHash,
    resetTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
  });
  const resetUrl = `${env.API_BASE_URL}/api/v1/auth/reset-password/${resetToken}`;
  await sendEmail({
    to: email,
    subject: "Password Reset",
    html: `<p>Click the link to reset your password:</p><a href="${resetUrl}">Reset Password</a>`,
  });
  return { message: "Password reset email sent" };
};

// ═══════════════════════════════════════════
// ✅ Reset Password
// ═══════════════════════════════════════════
export const resetPasswordService = async (token, newPassword) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await findUserByResetToken(tokenHash);
  if (!user) throw new Error("Invalid or expired token");
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({
    passwordHash: hashedPassword,
    resetTokenHash: null,
    resetTokenExpires: null,
  });
  return { message: "Password reset successful" };
};