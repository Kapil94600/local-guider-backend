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
import { logger } from "../../utils/logger.js";
import {
  redisGet,
  redisSet,
  redisDel,
} from "../../config/redis.js";

// Firebase auth instance cache
let firebaseAuth = null;
const getFirebaseAuth = () => {
  if (!firebaseAuth) firebaseAuth = admin.auth();
  return firebaseAuth;
};

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_TTL_SEC = 5 * 60;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

// ═══════════════════════════════════════════
// ✅ In-memory fallback (only if Redis down)
// ═══════════════════════════════════════════
const otpStore = new Map();

const otpSet = async (phone, record) => {
  const key = `otp:${phone}`;
  const stored = await redisSet(key, JSON.stringify(record), OTP_TTL_SEC);
  if (!stored) {
    // Redis unavailable — memory fallback
    otpStore.set(phone, record);
  }
};

const otpGet = async (phone) => {
  const key = `otp:${phone}`;
  const cached = await redisGet(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return otpStore.get(phone) || null;
};

const otpDel = async (phone) => {
  const key = `otp:${phone}`;
  await redisDel(key);
  otpStore.delete(phone);
};

// ═══════════════════════════════════════════
// SENSITIVE FIELDS
// ═══════════════════════════════════════════
const SENSITIVE_FIELDS = [
  "passwordHash",
  "resetTokenHash",
  "resetTokenExpires",
  "googleId",
];

const sanitizeUser = (user) => {
  if (!user) return null;
  const u = user.toJSON ? user.toJSON() : { ...user };
  for (const field of SENSITIVE_FIELDS) {
    delete u[field];
  }
  return u;
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
const generateTokensForUser = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user),
});

const saveRefreshTokenInBackground = (userId, refreshToken) => {
  saveRefreshToken({
    userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  }).catch((err) =>
    logger.error(`⚠️ Background refresh save failed: ${err.message}`)
  );
};

// ═══════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════
export const registerUser = async (payload) => {
  const [existingUser, hashedPassword] = await Promise.all([
    findUserByEmail(payload.email),
    bcrypt.hash(payload.password, BCRYPT_ROUNDS),
  ]);

  if (existingUser) throw new Error("User already exists");

  let user;
  try {
    user = await createUser({
      firstName: payload.firstName,
      lastName: payload.lastName || null,
      email: payload.email,
      phone: payload.phone,
      passwordHash: hashedPassword,
      role: "USER",
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      throw new Error("User already exists");
    }
    throw err;
  }

  try {
    await createWallet(user.id);
  } catch (walletErr) {
    logger.error(
      `❌ Wallet creation failed for user ${user.id}: ${walletErr.message}`
    );
    throw new Error("Account setup failed. Please try again.");
  }

  const tokens = generateTokensForUser(user);
  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  return { user: sanitizeUser(user), ...tokens };
};

// ═══════════════════════════════════════════
// LOGIN
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

  return { user: sanitizeUser(user), ...tokens };
};

// ═══════════════════════════════════════════
// SEND OTP (DEV)
// ═══════════════════════════════════════════
export const sendOtpService = async (phone) => {
  if (!phone) throw new Error("Phone number is required");

  const cleanPhone = phone.trim();
  const otp = crypto.randomInt(100000, 1000000).toString();

  await otpSet(cleanPhone, {
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
// VERIFY OTP
// ═══════════════════════════════════════════
export const verifyOtpService = async (phone, otp) => {
  if (!phone) throw new Error("Phone number is required");
  if (!otp) throw new Error("OTP is required");

  const cleanPhone = phone.trim();
  const cleanOtp = otp.trim();

  const record = await otpGet(cleanPhone);
  if (!record) throw new Error("OTP not found. Please request new OTP.");

  if (Date.now() > record.expiresAt) {
    await otpDel(cleanPhone);
    throw new Error("OTP expired. Please request new OTP.");
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    await otpDel(cleanPhone);
    throw new Error("Too many attempts. Request new OTP.");
  }

  if (record.otp !== cleanOtp) {
    // Save updated attempts
    await otpSet(cleanPhone, record);
    throw new Error("Invalid OTP");
  }

  await otpDel(cleanPhone);

  let user = await findUserByPhone(cleanPhone);

  if (!user) {
    try {
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
      user.wasNew = true;
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        user = await findUserByPhone(cleanPhone);
        if (!user) throw err;
      } else {
        throw err;
      }
    }

    if (user.wasNew) {
      try {
        await createWallet(user.id);
      } catch (walletErr) {
        logger.error(
          `❌ Wallet creation failed in OTP flow: ${walletErr.message}`
        );
      }
    }

    logger.info(`✅ New user created via OTP: ${user.id}`);
  } else {
    logger.info(`✅ Existing user logged in via OTP: ${user.id}`);
  }

  const tokens = generateTokensForUser(user);
  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  return { user: sanitizeUser(user), ...tokens };
};

// ═══════════════════════════════════════════
// FIREBASE PHONE AUTH
// ═══════════════════════════════════════════
export const verifyFirebaseTokenService = async (idToken) => {
  if (!idToken) throw new Error("ID token is required");

  const decoded = await getFirebaseAuth().verifyIdToken(idToken);
  const phone = decoded.phone_number;
  if (!phone) throw new Error("Phone number not found in Firebase token");

  let user = await findUserByPhone(phone);

  if (!user) {
    try {
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
      user.wasNew = true;
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        user = await findUserByPhone(phone);
        if (!user) throw err;
      } else {
        throw err;
      }
    }

    if (user.wasNew) {
      try {
        await createWallet(user.id);
      } catch (walletErr) {
        logger.error(
          `❌ Wallet creation failed in Firebase flow: ${walletErr.message}`
        );
      }
    }
  }

  const tokens = generateTokensForUser(user);
  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  return { user: sanitizeUser(user), ...tokens };
};

// ═══════════════════════════════════════════
// REFRESH TOKEN
// ═══════════════════════════════════════════
export const refreshUserToken = async (refreshToken) => {
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
// LOGOUT
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// LOGOUT
// ✅ FIX: Verify token ownership
// ═══════════════════════════════════════════
export const logoutUser = async (refreshToken, userId = null) => {
  if (!refreshToken) throw new Error("Refresh token is required");

  const storedToken = await getRefreshToken(refreshToken);

  // ✅ If userId provided, verify ownership
  if (userId && storedToken && storedToken.userId !== userId) {
    throw new Error("Unauthorized to revoke this token");
  }

  await revokeRefreshToken(refreshToken);
  return { message: "Logout successful" };
};

// ═══════════════════════════════════════════
// GOOGLE LOGIN
// ═══════════════════════════════════════════
export const googleLoginService = async (payload) => {
  const { googleId, email, firstName, lastName, profileImage } = payload;

  const [userByGoogle, userByEmail] = await Promise.all([
    findUserByGoogleId(googleId),
    findUserByEmail(email),
  ]);

  let user = userByGoogle || userByEmail;

  if (!user) {
    try {
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
      user.wasNew = true;
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        user =
          (await findUserByGoogleId(googleId)) ||
          (await findUserByEmail(email));
        if (!user) throw err;
      } else {
        throw err;
      }
    }

    if (user.wasNew) {
      try {
        await createWallet(user.id);
      } catch (walletErr) {
        logger.error(
          `❌ Wallet creation failed in Google flow: ${walletErr.message}`
        );
      }
    }
  }

  const tokens = generateTokensForUser(user);
  saveRefreshTokenInBackground(user.id, tokens.refreshToken);

  return { user: sanitizeUser(user), ...tokens };
};

// ═══════════════════════════════════════════
// FORGOT PASSWORD
// ═══════════════════════════════════════════
export const forgotPasswordService = async (email) => {
  const user = await findUserByEmail(email);

  const GENERIC_MESSAGE =
    "If this email is registered, a reset link has been sent.";

  if (!user) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    return { message: GENERIC_MESSAGE };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  await user.update({
    resetTokenHash: tokenHash,
    resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  const resetUrl = `${env.API_BASE_URL}/api/v1/auth/reset-password/${resetToken}`;

  sendEmail({
    to: email,
    subject: "Password Reset",
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  }).catch((err) => logger.error(`Email send failed: ${err.message}`));

  return { message: GENERIC_MESSAGE };
};

// ═══════════════════════════════════════════
// RESET PASSWORD
// ═══════════════════════════════════════════
export const resetPasswordService = async (token, newPassword) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

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