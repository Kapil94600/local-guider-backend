// src/modules/wallet/wallet.repository.js
import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════════════════════════
// FIND wallet by userId
// ═══════════════════════════════════════════════════════════════
export const findWalletByUserId = async (userId, options = {}) => {
  return await Wallet.findOne({
    where: { userId },
    transaction: options.transaction,
    lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
  });
};

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════
export const getTransactionsByWalletId = async (walletId) => {
  return await WalletTransaction.findAll({
    where: { walletId },
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: getAllWallets — User association alias removed
// ═══════════════════════════════════════════════════════════════
export const getAllWallets = async ({ page = 1, limit = 10 } = {}) => {
  return await Wallet.findAndCountAll({
    include: [
      {
        model: User,
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "role",
          "profileImage",
        ],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
  });
};

// ═══════════════════════════════════════════════════════════════
// CREATE transaction
// ═══════════════════════════════════════════════════════════════
export const createTransaction = async (payload, options = {}) => {
  return await WalletTransaction.create(payload, options);
};