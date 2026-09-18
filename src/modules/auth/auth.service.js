// src/modules/auth/auth.service.js
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
  findUserByGoogleId,
} from "./auth.repository.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./token.service.js";
import { sendEmail } from "../../utils/emailService.js";
import { env } from "../../config/env.js";

// ═══════════════════════════════════════════
// ⚡ CACHE — Firebase auth instance (ek baar)
// ═══════════════════════════════════════════
let firebaseAuth = null;
const getFirebaseAuth = () => {
  if (!firebaseAuth) firebaseAuth = admin.auth();
  return firebaseAuth;
};

// ═══════════════════════════════════════════
// ⚡ CONSTANTS
// ═══════════════════════════════════════════
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BCRYPT_ROUNDS = 10;
const OTP_TTL_MS = 5 * 60 * 1000;

// In-memory OTP store (dev/testing)
const otpStore = new Map();

// ═══════════════════════════════════════════
// ⚡ HELPERS
// ═══════════════════════════════════════════
const generateTokensForUser = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user),
});

// ⚡ Background refresh token save (non-blocking)
const saveRefreshTokenInBackground = (userId, refreshToken) => {
  saveRefreshToken({
    userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  }).catch((err) =>
    console.error("⚠️ Background refresh save failed:", err.message)
  );
};

// ═══════════════════════════════════════════
// ✅ Register — optimized
// ═══════════════════════════════════════════
export const registerUser = async (payload) => {
  // ⚡ Parallel: email check + password hash
  const [existingUser, hashedPassword] = await Promise.all([
    findUserByEmail(payload.email),
    bcrypt.hash(payload.password, BCRYPT_ROUNDS),
  ]);

  if (existingUser) throw new Error("User already exists");

  const user = await createUser({
    firstName: payload.firstName,
    lastName: payload.lastName || null,
    email: payload.email,
    phone: payload.phone,
    passwordHash: hashedPassword,
    role: "USER",
  });

  // ⚡ Parallel: wallet + JWT gen
  const [, tokens] = await Promise.all([
    createWallet(user.id),
    Promise.resolve(generateTokensForUser(user)),
  ]);

  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  return { user, ...tokens };
};

// ═══════════════════════════════════════════
// ✅ Login — optimized
// ═══════════════════════════════════════════
export const loginUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("Invalid credentials");
  if (!user.passwordHash)
    throw new Error("Password login not available for this account");

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error("Invalid credentials");

  const tokens = generateTokensForUser(user);
  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  return { user, ...tokens };
};

// ═══════════════════════════════════════════
// ✅ Send OTP — DEV MODE (fast)
// ═══════════════════════════════════════════
export const sendOtpService = async (phone) => {
  if (!phone) throw new Error("Phone number is required");

  const cleanPhone = phone.trim();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(cleanPhone, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  setImmediate(() => {
    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("📱 Phone:", cleanPhone);
    console.log("🔑 OTP CODE:", otp);
    console.log("⏰ Expires in: 5 minutes");
    console.log("═══════════════════════════════════════");
    console.log("");
  });

  return { phone: cleanPhone };
};

// ═══════════════════════════════════════════
// ✅ Verify OTP — DEV MODE (optimized)
// ═══════════════════════════════════════════
export const verifyOtpService = async (phone, otp) => {
  if (!phone) throw new Error("Phone number is required");
  if (!otp) throw new Error("OTP is required");

  const cleanPhone = phone.trim();
  const cleanOtp = otp.trim();

  const record = otpStore.get(cleanPhone);
  if (!record) throw new Error("OTP not found. Please request new OTP.");

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    throw new Error("OTP expired. Please request new OTP.");
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    otpStore.delete(cleanPhone);
    throw new Error("Too many attempts. Request new OTP.");
  }

  if (record.otp !== cleanOtp) throw new Error("Invalid OTP");

  otpStore.delete(cleanPhone);

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

    createWallet(user.id).catch((err) =>
      console.error("Wallet create error:", err.message)
    );

    console.log("✅ New user created via OTP:", user.id);
  } else {
    console.log("✅ Existing user logged in via OTP:", user.id);
  }

  const tokens = generateTokensForUser(user);
  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  return { user, ...tokens };
};

// ═══════════════════════════════════════════
// 🔥 Firebase Phone Auth — MAXIMUM OPTIMIZED
// ═══════════════════════════════════════════
export const verifyFirebaseTokenService = async (idToken) => {
  if (!idToken) throw new Error("ID token is required");

  // ── Step 1: Verify token ──
  let decoded;
  try {
    decoded = await getFirebaseAuth().verifyIdToken(idToken);
  } catch (error) {
    console.error("❌ Firebase verify error:", error.message);
    throw new Error("Invalid or expired Firebase token");
  }

  const phone = decoded.phone_number;
  if (!phone) throw new Error("Phone number not found in Firebase token");

  // ── Step 2: Find user ──
  let user = await findUserByPhone(phone);

  // ═══════════════════════════════════════════
  // NEW USER PATH
  // ═══════════════════════════════════════════
  if (!user) {
    user = await createUser({
      firstName: "User",
      lastName: null,
      email: `${phone.replace("+", "")}@localguider.com`,
      phone,
      passwordHash: null,
      role: "USER",
      isVerified: true,
      isActive: true,
      accountStatus: "ACTIVE",
      phoneVerifiedAt: new Date(),
    });

    // ⚡ Background wallet create
    createWallet(user.id).catch((err) =>
      console.error("Wallet create error:", err.message)
    );

    const tokens = generateTokensForUser(user);
    saveRefreshTokenInBackground(user.id, tokens.refreshToken);

    setImmediate(() =>
      console.log("✅ New user created via Firebase:", user.id)
    );

    return { user, ...tokens };
  }

  // ═══════════════════════════════════════════
  // EXISTING USER PATH
  // ═══════════════════════════════════════════
  const tokens = generateTokensForUser(user);
  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  setImmediate(() =>
    console.log("✅ Existing user logged in via Firebase:", user.id)
  );

  return { user, ...tokens };
};

// ═══════════════════════════════════════════
// ✅ Refresh Token — optimized
// ═══════════════════════════════════════════
export const refreshUserToken = async (refreshToken) => {
  // ⚡ Parallel: DB check + JWT verify
  const [storedToken, decoded] = await Promise.all([
    getRefreshToken(refreshToken),
    Promise.resolve(verifyRefreshToken(refreshToken)),
  ]);

  if (!storedToken) throw new Error("Invalid refresh token");

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
// ✅ Google Login — optimized
// ═══════════════════════════════════════════
export const googleLoginService = async (payload) => {
  const { googleId, email, firstName, lastName, profileImage } = payload;

  // ⚡ Parallel lookups
  const [userByGoogle, userByEmail] = await Promise.all([
    findUserByGoogleId(googleId),
    findUserByEmail(email),
  ]);

  let user = userByGoogle || userByEmail;

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

    createWallet(user.id).catch((err) =>
      console.error("Wallet create error:", err.message)
    );
  }

  const tokens = generateTokensForUser(user);
  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  return { user, ...tokens };
};

// ═══════════════════════════════════════════
// ✅ Forgot Password — optimized (email background)
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

  // ⚡ Email in background (doesn't block response)
  sendEmail({
    to: email,
    subject: "Password Reset",
    html: `<p>Click the link to reset your password:</p><a href="${resetUrl}">Reset Password</a>`,
  }).catch((err) => console.error("Email send failed:", err.message));

  return { message: "Password reset email sent" };
};

// ═══════════════════════════════════════════
// ✅ Reset Password — optimized
// ═══════════════════════════════════════════
export const resetPasswordService = async (token, newPassword) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // ⚡ Parallel: lookup + hash
  const [user, hashedPassword] = await Promise.all([
    findUserByResetToken(tokenHash),
    bcrypt.hash(newPassword, BCRYPT_ROUNDS),
  ]);

  if (!user) throw new Error("Invalid or expired token");

  await user.update({
    passwordHash: hashedPassword,
    resetTokenHash: null,
    resetTokenExpires: null,
  });

  return { message: "Password reset successful" };
};