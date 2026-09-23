// src/modules/bookings/refund.service.js
// ═══════════════════════════════════════════════════════════════
// CENTRALIZED REFUND SERVICE
// Used by booking.service.js (and anywhere else refunds needed)
// This is the SINGLE source of truth for refunds
// ═══════════════════════════════════════════════════════════════
import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";

// ═══════════════════════════════════════════════════════════════
// REFUND booking to customer wallet (idempotent)
// ═══════════════════════════════════════════════════════════════
// @param booking     — Booking instance (needs .id, .userId, .totalAmount)
// @param transaction — Sequelize transaction (REQUIRED)
// @returns refundTxn | null
// ═══════════════════════════════════════════════════════════════
export const refundBookingToWallet = async (booking, transaction) => {
  if (!transaction) {
    throw new Error("refundBookingToWallet requires a Sequelize transaction");
  }

  // ── 1. Find original DEBIT (payment) transaction ──
  const paymentTxn = await WalletTransaction.findOne({
    where: {
      referenceId: booking.id,
      transactionType: "DEBIT",
    },
    transaction,
  });

  if (!paymentTxn) {
    console.log(
      `ℹ️ No payment found for booking ${booking.id.slice(
        0,
        8
      )} — skipping refund`
    );
    return null;
  }

  // ── 2. Double-refund guard ──
  const alreadyRefunded = await WalletTransaction.findOne({
    where: {
      referenceId: booking.id,
      transactionType: "REFUND",
    },
    transaction,
  });

  if (alreadyRefunded) {
    console.log(
      `ℹ️ Booking ${booking.id.slice(0, 8)} already refunded — skipping`
    );
    return null;
  }

  // ── 3. Lock wallet ──
  const wallet = await Wallet.findOne({
    where: { userId: booking.userId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!wallet) {
    console.error(
      `❌ Wallet not found for user ${booking.userId} — refund failed`
    );
    return null;
  }

  // ── 4. Compute new balance ──
  const amount = parseFloat(paymentTxn.amount);
  const currentBalance = parseFloat(wallet.balance || 0);
  const newBalance = currentBalance + amount;

  // ── 5. Create REFUND transaction ──
  const refundTxn = await WalletTransaction.create(
    {
      walletId: wallet.id,
      transactionType: "REFUND",
      amount,
      balanceAfter: newBalance,
      referenceId: booking.id,
      description: `Refund (credited to wallet) for cancelled booking ${booking.id.slice(
        0,
        8
      )}`,
    },
    { transaction }
  );

  // ── 6. Update wallet balance ──
  await wallet.update({ balance: newBalance }, { transaction });

  console.log(
    `✅ Refunded ₹${amount} to user ${booking.userId} for booking ${booking.id.slice(
      0,
      8
    )}`
  );

  return refundTxn;
};

export default { refundBookingToWallet };