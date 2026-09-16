import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";
import User from "../../database/models/core/User.js";

export const findWalletByUserId = async (userId) => {
  return await Wallet.findOne({ where: { userId } });
};

export const getTransactionsByWalletId = async (walletId) => {
  return await WalletTransaction.findAll({
    where: { walletId },
    order: [["createdAt", "DESC"]],
  });
};

export const getAllWallets = async ({ page = 1, limit = 10 } = {}) => {
  return await Wallet.findAndCountAll({
    include: [
      {
        model: User,
        as: "User",
        attributes: ["id", "firstName", "lastName", "email", "phone", "role"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
};

export const createTransaction = async (payload) => {
  return await WalletTransaction.create(payload);
};