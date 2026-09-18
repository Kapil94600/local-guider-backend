// src/modules/auth/auth.repository.js
import User from "../../database/models/core/User.js";
import Wallet from "../../database/models/core/Wallet.js";
import RefreshToken from "../../database/models/core/RefreshToken.js";
import { Op } from "sequelize";

// ⚡ Common attributes (reduce data transfer)
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
];

// ═══════════════════════════════════════════
// FIND USER — with optimized attribute selection
// ═══════════════════════════════════════════

export const findUserByEmail = async (email) => {
  return await User.findOne({
    where: { email },
    attributes: USER_AUTH_ATTRS, // ⚡ only needed fields
  });
};

export const findUserByPhone = async (phone) => {
  return await User.findOne({
    where: { phone },
    attributes: USER_AUTH_ATTRS, // ⚡ only needed fields
  });
};

export const findUserById = async (id) => {
  return await User.findByPk(id, {
    attributes: USER_SAFE_ATTRS,
  });
};

export const findUserByGoogleId = async (googleId) => {
  return await User.findOne({
    where: { googleId },
    attributes: USER_AUTH_ATTRS,
  });
};

// ✅ Reset token se user dhundho
export const findUserByResetToken = async (tokenHash) => {
  return await User.findOne({
    where: {
      resetTokenHash: tokenHash,
      resetTokenExpires: { [Op.gt]: new Date() },
    },
    attributes: ["id", "email", "resetTokenHash", "resetTokenExpires"],
  });
};

// ═══════════════════════════════════════════
// CREATE USER
// ═══════════════════════════════════════════
export const createUser = async (payload) => {
  return await User.create(payload);
};

export const createWallet = async (userId) => {
  return await Wallet.create({ userId, balance: 0 });
};

// ═══════════════════════════════════════════
// REFRESH TOKEN
// ═══════════════════════════════════════════
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