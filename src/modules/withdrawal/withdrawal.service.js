// src/modules/withdrawal/withdrawal.service.js
import {
  createWithdrawalRequest,
  getWithdrawalRequestsByUser,
  getAllWithdrawalRequests,
  getWithdrawalRequestById,
  updateWithdrawalRequest,
} from "./withdrawal.repository.js";
import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";

export const submitWithdrawalRequest = async (userId, payload) => {
  const { amount, accountName, accountNumber, bankName, ifscCode, upiId } = payload;

  if (!amount || parseFloat(amount) <= 0) {
    throw new Error("Valid amount required");
  }
  if (!accountName || !accountNumber || !bankName || !ifscCode) {
    throw new Error("Bank details required");
  }

  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) throw new Error("Wallet not found");

  if (parseFloat(wallet.balance) < parseFloat(amount)) {
    throw new Error("Insufficient balance");
  }

  return await createWithdrawalRequest({
    userId,
    amount: parseFloat(amount),
    accountName,
    accountNumber,
    bankName,
    ifscCode,
    upiId: upiId || null,
    status: "PENDING",
  });
};

export const fetchMyWithdrawalRequests = async (userId) => {
  return await getWithdrawalRequestsByUser(userId);
};

export const fetchAllWithdrawalRequests = async (params = {}) => {
  return await getAllWithdrawalRequests(params);
};

// ✅ Added
export const fetchWithdrawalRequestById = async (id) => {
  const request = await getWithdrawalRequestById(id);
  if (!request) throw new Error("Withdrawal request not found");
  return request;
};

export const processWithdrawalRequest = async (requestId, status, adminMessage) => {
  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw new Error("Invalid status");
  }

  const request = await getWithdrawalRequestById(requestId);
  if (!request) throw new Error("Withdrawal request not found");
  if (request.status !== "PENDING") throw new Error("Request already processed");

  if (status === "APPROVED") {
    const wallet = await Wallet.findOne({ where: { userId: request.userId } });
    if (!wallet) throw new Error("Wallet not found");

    if (parseFloat(wallet.balance) < parseFloat(request.amount)) {
      throw new Error("Insufficient balance");
    }

    const newBalance = parseFloat(wallet.balance) - parseFloat(request.amount);
    await wallet.update({ balance: newBalance });

    await WalletTransaction.create({
      walletId: wallet.id,
      transactionType: "WITHDRAWAL",
      amount: parseFloat(request.amount),
      balanceAfter: newBalance,
      description: `Withdrawal to ${request.accountName} (${request.accountNumber})`,
    });
  }

  return await updateWithdrawalRequest(requestId, {
    status,
    adminMessage: adminMessage || null,
    processedAt: new Date(),
  });
};