// src/modules/wallet/wallet.service.js
import {
  findWalletByUserId,
  getTransactionsByWalletId,
  getAllWallets,
  createTransaction,
} from "./wallet.repository.js";
import { sequelize } from "../../config/database.js";
import { ApiError } from "../../utils/apiError.js";

// ═══════════════════════════════════════════════════════════════
// GET wallet
// ═══════════════════════════════════════════════════════════════
export const getWallet = async (userId) => {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) throw new ApiError(404, "Wallet not found");
  return wallet;
};

// ═══════════════════════════════════════════════════════════════
// GET transactions
// ═══════════════════════════════════════════════════════════════
export const getWalletTransactions = async (userId) => {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) throw new ApiError(404, "Wallet not found");
  return await getTransactionsByWalletId(wallet.id);
};

// ═══════════════════════════════════════════════════════════════
// GET all wallets (admin)
// ═══════════════════════════════════════════════════════════════
export const getAllWalletsService = async ({ page = 1, limit = 10 } = {}) => {
  return await getAllWallets({ page, limit });
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: Admin balance update — ATOMIC + VALIDATION
// ═══════════════════════════════════════════════════════════════
export const updateWalletBalanceService = async (
  userId,
  amount,
  type = "CREDIT",
  description = ""
) => {
  const parsedAmount = parseFloat(amount);

  // ── Validation ──
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new ApiError(400, "Amount must be a positive number");
  }
  if (!["CREDIT", "DEBIT"].includes(type)) {
    throw new ApiError(400, "Type must be CREDIT or DEBIT");
  }
  if (!description || !description.trim()) {
    throw new ApiError(400, "Description is required for admin adjustment");
  }

  const t = await sequelize.transaction();

  try {
    // Lock wallet
    const wallet = await findWalletByUserId(userId, { transaction: t });
    if (!wallet) throw new ApiError(404, "Wallet not found");

    const currentBalance = parseFloat(wallet.balance || 0);

    const newBalance =
      type === "CREDIT"
        ? currentBalance + parsedAmount
        : currentBalance - parsedAmount;

    if (newBalance < 0) {
      throw new ApiError(
        400,
        `Insufficient balance. Available: ₹${currentBalance.toFixed(
          2
        )}, Required: ₹${parsedAmount.toFixed(2)}`
      );
    }

    // Update wallet
    await wallet.update({ balance: newBalance }, { transaction: t });

    // Log transaction
    await createTransaction(
      {
        walletId: wallet.id,
        transactionType: type,
        amount: parsedAmount,
        balanceAfter: newBalance,
        description: description.trim(),
      },
      { transaction: t }
    );

    await t.commit();

    return {
      walletId: wallet.id,
      previousBalance: currentBalance,
      newBalance,
      amount: parsedAmount,
      type,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};