// src/modules/withdrawal/withdrawal.service.js
import {
  createWithdrawalRequest,
  getWithdrawalRequestsByUser,
  getAllWithdrawalRequests,
  getWithdrawalRequestById,
  updateWithdrawalRequest,
  findPendingByUserId,
} from "./withdrawal.repository.js";
import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";
import User from "../../database/models/core/User.js";
import { sequelize } from "../../config/database.js";
import { addNotification } from "../notifications/notification.service.js";
import { ApiError } from "../../utils/apiError.js";
import { calculateCommission } from "../../config/commission.config.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// SUBMIT WITHDRAWAL REQUEST
// ═══════════════════════════════════════════════════════════════
export const submitWithdrawalRequest = async (userId, payload) => {
  const { amount, accountName, accountNumber, bankName, ifscCode, upiId } =
    payload;

  // ── Validation ──
  const parsedAmount = parseFloat(amount);
  if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
    throw new ApiError(400, "Valid withdrawal amount is required");
  }
  if (parsedAmount < 100) {
    throw new ApiError(400, "Minimum withdrawal amount is ₹100");
  }
  if (
    !accountName?.trim() ||
    !accountNumber?.trim() ||
    !bankName?.trim() ||
    !ifscCode?.trim()
  ) {
    throw new ApiError(400, "All bank details are required");
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
    throw new ApiError(400, "Invalid IFSC code format");
  }

  // Fetch user role for commission
  const user = await User.findByPk(userId, {
    attributes: ["id", "role"],
  });
  if (!user) throw new ApiError(404, "User not found");

  const commission = calculateCommission(parsedAmount, user.role);

  // ═══════════════════════════════════════════════════════════════
  // ATOMIC TRANSACTION
  // ═══════════════════════════════════════════════════════════════
  const t = await sequelize.transaction();

  try {
    // Lock wallet
    const wallet = await Wallet.findOne({
      where: { userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!wallet) {
      throw new ApiError(404, "Wallet not found");
    }

    const currentBalance = parseFloat(wallet.balance || 0);

    if (currentBalance < parsedAmount) {
      throw new ApiError(
        400,
        `Insufficient balance. Available: ₹${currentBalance.toFixed(2)}`
      );
    }

    // ✅ Pending check WITH LOCK (defense-in-depth)
    const existingPending = await findPendingByUserId(userId, t);
    if (existingPending) {
      throw new ApiError(
        409,
        "You already have a pending withdrawal request. Please wait for admin action."
      );
    }

    // ✅ HOLD balance immediately
    const newBalance = currentBalance - parsedAmount;
    await wallet.update({ balance: newBalance }, { transaction: t });

    // ✅ Create withdrawal request with commission snapshot
    const request = await createWithdrawalRequest(
      {
        userId,
        amount: parsedAmount,
        commissionPercentage: commission.percentage,
        commissionAmount: commission.commissionAmount,
        netAmount: commission.netAmount,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        upiId: upiId?.trim() || null,
        status: "PENDING",
      },
      { transaction: t }
    );

    // ✅ Log WITHDRAWAL transaction (hold) — single source of truth
    await WalletTransaction.create(
      {
        walletId: wallet.id,
        transactionType: "WITHDRAWAL",
        amount: parsedAmount,
        balanceAfter: newBalance,
        referenceId: request.id,
        description: `Withdrawal request submitted (on hold) — Net: ₹${commission.netAmount}, Commission: ₹${commission.commissionAmount}`,
      },
      { transaction: t }
    );

    await t.commit();

    logger.info(
      `✅ Withdrawal created: ${request.id.slice(0, 8)} | Gross: ₹${parsedAmount} | Commission: ₹${commission.commissionAmount} (${commission.percentage}%) | Net: ₹${commission.netAmount}`
    );

    // Notification (outside transaction)
    try {
      await addNotification({
        userId,
        title: "Withdrawal Request Submitted",
        message: `Your withdrawal request of ₹${parsedAmount} has been submitted. You will receive ₹${commission.netAmount} after ${commission.percentage}% commission (₹${commission.commissionAmount}).`,
        type: "WITHDRAWAL",
        data: {
          withdrawalId: request.id,
          amount: parsedAmount,
          commissionAmount: commission.commissionAmount,
          netAmount: commission.netAmount,
          commissionPercentage: commission.percentage,
        },
      });
    } catch (notifErr) {
      logger.error(`Withdrawal notification failed: ${notifErr.message}`);
    }

    return request;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════
export const fetchMyWithdrawalRequests = async (userId) => {
  return await getWithdrawalRequestsByUser(userId);
};

export const fetchAllWithdrawalRequests = async (params = {}) => {
  return await getAllWithdrawalRequests(params);
};

export const fetchWithdrawalRequestById = async (id) => {
  const request = await getWithdrawalRequestById(id);
  if (!request) throw new ApiError(404, "Withdrawal request not found");
  return request;
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-2: PROCESS WITHDRAWAL
// - On APPROVE: create COMMISSION transaction (audit trail)
// - On REJECT: refund with REFUND transaction
// ═══════════════════════════════════════════════════════════════
export const processWithdrawalRequest = async (
  requestId,
  status,
  adminMessage
) => {
  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const t = await sequelize.transaction();

  try {
    // ✅ Use locked fetch (returns plain object with User)
    const request = await getWithdrawalRequestById(requestId, t);
    if (!request) {
      throw new ApiError(404, "Withdrawal request not found");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, "Request already processed");
    }

    // ═══════════════════════════════════════════════════════════════
    // CASE 1: REJECTED — refund full amount to user
    // ═══════════════════════════════════════════════════════════════
    if (status === "REJECTED") {
      const wallet = await Wallet.findOne({
        where: { userId: request.userId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (wallet) {
        const refundAmount = parseFloat(request.amount);
        const newBalance = parseFloat(wallet.balance || 0) + refundAmount;

        await wallet.update({ balance: newBalance }, { transaction: t });

        // ✅ REFUND transaction
        await WalletTransaction.create(
          {
            walletId: wallet.id,
            transactionType: "REFUND",
            amount: refundAmount,
            balanceAfter: newBalance,
            referenceId: request.id,
            description: `Withdrawal rejected — refund of ₹${refundAmount}`,
          },
          { transaction: t }
        );
      }

      await updateWithdrawalRequest(
        requestId,
        {
          status,
          adminMessage: adminMessage || null,
          processedAt: new Date(),
        },
        { transaction: t }
      );

      await t.commit();

      try {
        await addNotification({
          userId: request.userId,
          title: "Withdrawal Rejected",
          message: `Your withdrawal request of ₹${request.amount} was rejected. The amount has been refunded to your wallet.${
            adminMessage ? ` Reason: ${adminMessage}` : ""
          }`,
          type: "WITHDRAWAL",
          data: { withdrawalId: request.id, status: "REJECTED" },
        });
      } catch (notifErr) {
        logger.error(`Reject notification failed: ${notifErr.message}`);
      }

      return await getWithdrawalRequestById(requestId);
    }

    // ═══════════════════════════════════════════════════════════════
    // CASE 2: APPROVED
    // ✅ FIX B-2: Create COMMISSION transaction for audit trail
    // Balance already held on SUBMIT — no new deduction
    // ═══════════════════════════════════════════════════════════════
    const commissionAmount = parseFloat(request.commissionAmount || 0);
    const commissionPercentage = parseFloat(request.commissionPercentage || 0);
    const netAmount = parseFloat(request.netAmount || request.amount);

    // ✅ FIX B-2: Log COMMISSION transaction (audit trail)
    if (commissionAmount > 0) {
      const wallet = await Wallet.findOne({
        where: { userId: request.userId },
        transaction: t,
      });

      if (wallet) {
        // Log commission as informational (no balance change)
        await WalletTransaction.create(
          {
            walletId: wallet.id,
            transactionType: "COMMISSION",
            amount: commissionAmount,
            balanceAfter: parseFloat(wallet.balance || 0), // No change
            referenceId: request.id,
            description: `Commission for withdrawal ${request.id.slice(
              0,
              8
            )} — ${commissionPercentage}% of ₹${request.amount}`,
          },
          { transaction: t }
        );

        logger.info(
          `💰 Commission logged: ₹${commissionAmount} (${commissionPercentage}%) for withdrawal ${request.id.slice(0, 8)}`
        );
      }
    }

    await updateWithdrawalRequest(
      requestId,
      {
        status,
        adminMessage: adminMessage || null,
        processedAt: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    logger.info(
      `✅ Withdrawal approved: ${requestId.slice(0, 8)} | Net: ₹${netAmount} | Commission: ₹${commissionAmount}`
    );

    try {
      await addNotification({
        userId: request.userId,
        title: "Withdrawal Approved ✅",
        message: `Your withdrawal of ₹${netAmount.toFixed(2)} has been approved. Amount will be credited to ${request.bankName} account ending ${String(request.accountNumber).slice(-4)}. (Commission: ₹${commissionAmount.toFixed(2)})`,
        type: "WITHDRAWAL",
        data: {
          withdrawalId: request.id,
          status: "APPROVED",
          amount: netAmount,
          commissionAmount,
        },
      });
    } catch (notifErr) {
      logger.error(`Approve notification failed: ${notifErr.message}`);
    }

    return await getWithdrawalRequestById(requestId);
  } catch (error) {
    await t.rollback();
    logger.error(`❌ Withdrawal processing failed: ${error.message}`);
    throw error;
  }
};