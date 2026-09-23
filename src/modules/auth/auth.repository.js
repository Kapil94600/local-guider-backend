// src/modules/auth/auth.repository.js
import User from "../../database/models/core/User.js";
import Wallet from "../../database/models/core/Wallet.js";
import RefreshToken from "../../database/models/core/RefreshToken.js";
import { Op } from "sequelize";

// ═══════════════════════════════════════════════════════════════
// ATTRIBUTE LISTS
// ═══════════════════════════════════════════════════════════════

// ⚡ Common attributes (safe — no sensitive fields)
const USER_SAFE_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "email",
  "phone",
  "role",
  "profileImage",
  "isVerified",
  "isActive",
  "accountStatus",
  "phoneVerifiedAt",
  "emailVerifiedAt",
  "lastLoginAt",
  "createdAt",
];

// ⚡ Login-specific attributes (needed for auth)
// ✅ Includes provider + googleId for OAuth flow
const USER_AUTH_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "email",
  "phone",
  "passwordHash",
  "role",
  "profileImage",
  "isVerified",
  "isActive",
  "accountStatus",
  "phoneVerifiedAt",
  "provider",
  "googleId",
];

// ═══════════════════════════════════════════════════════════════
// FIND USER — with .scope("withPassword") to bypass defaultScope
// ═══════════════════════════════════════════════════════════════
// The User model has defaultScope that excludes:
//   - passwordHash, resetTokenHash, resetTokenExpires, googleId
//
// For auth operations (login, OTP, Google login), we need passwordHash
// and googleId, so we explicitly use withPassword scope.
// ═══════════════════════════════════════════════════════════════

export const findUserByEmail = async (email) => {
  return await User.scope("withPassword").findOne({
    where: { email },
    attributes: USER_AUTH_ATTRS,
  });
};

export const findUserByPhone = async (phone) => {
  return await User.scope("withPassword").findOne({
    where: { phone },
    attributes: USER_AUTH_ATTRS,
  });
};

// ✅ SAFE — defaultScope auto-applies (passwordHash, googleId excluded)
export const findUserById = async (id) => {
  return await User.findByPk(id, {
    attributes: USER_SAFE_ATTRS,
  });
};

// ✅ Needs googleId + withPassword scope for Google login flow
export const findUserByGoogleId = async (googleId) => {
  return await User.scope("withPassword", "withGoogleId").findOne({
    where: { googleId },
    attributes: USER_AUTH_ATTRS,
  });
};

// ✅ Reset token — needs withPassword scope (resetTokenHash excluded by default)
export const findUserByResetToken = async (tokenHash) => {
  return await User.scope("withPassword").findOne({
    where: {
      resetTokenHash: tokenHash,
      resetTokenExpires: { [Op.gt]: new Date() },
    },
    attributes: ["id", "email", "resetTokenHash", "resetTokenExpires"],
  });
};

// ═══════════════════════════════════════════════════════════════
// CREATE USER
// ═══════════════════════════════════════════════════════════════
export const createUser = async (payload) => {
  return await User.create(payload);
};

export const createWallet = async (userId) => {
  return await Wallet.create({ userId, balance: 0 });
};

// ═══════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ═══════════════════════════════════════════════════════════════
export const saveRefreshToken = async (payload) => {
  return await RefreshToken.create(payload);
};

export const revokeRefreshToken = async (token) => {
  return await RefreshToken.update(
    { isRevoked: true },
    { where: { token } }
  );
};

export const getRefreshToken = async (token) => {
  return await RefreshToken.findOne({
    where: { token, isRevoked: false },
    attributes: ["id", "userId", "token", "expiresAt", "isRevoked"],
  });
};