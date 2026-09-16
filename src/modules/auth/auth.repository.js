import User from "../../database/models/core/User.js";
import Wallet from "../../database/models/core/Wallet.js";
import RefreshToken from "../../database/models/core/RefreshToken.js";
import { Op } from "sequelize";

export const findUserByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

export const findUserByPhone = async (phone) => {
  return await User.findOne({ where: { phone } });
};

export const findUserById = async (id) => {
  return await User.findByPk(id);
};

export const findUserByGoogleId = async (googleId) => {
  return await User.findOne({ where: { googleId } });
};

// ✅ Reset token se user dhundho
export const findUserByResetToken = async (tokenHash) => {
  return await User.findOne({
    where: {
      resetTokenHash: tokenHash,
      resetTokenExpires: { [Op.gt]: new Date() },
    },
  });
};

export const createUser = async (payload) => {
  return await User.create(payload);
};

export const createWallet = async (userId) => {
  return await Wallet.create({ userId, balance: 0 });
};

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
  });
};