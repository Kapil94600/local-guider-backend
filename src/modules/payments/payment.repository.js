// src/modules/payments/payment.repository.js
import Booking from "../../database/models/core/Booking.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: Removed `as: "User"` alias — associations has no alias
// ═══════════════════════════════════════════════════════════════
export const getBookingById = async (id) => {
  return await Booking.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "phone", "email"],
        // ✅ No alias
      },
    ],
  });
};

export const updateBookingStatus = async (id, status) => {
  const booking = await Booking.findByPk(id);
  if (!booking) return null;
  await booking.update({ status });
  return booking;
};

// ═══════════════════════════════════════════════════════════════
// WALLET TRANSACTION HELPERS
// ═══════════════════════════════════════════════════════════════
export const createTransaction = async (payload, options = {}) => {
  return await WalletTransaction.create(payload, options);
};

export const getTransactionByReference = async (referenceId, options = {}) => {
  return await WalletTransaction.findOne({
    where: { referenceId },
    ...options,
  });
};

export const getTransactionByReferenceAndType = async (
  referenceId,
  transactionType,
  options = {}
) => {
  return await WalletTransaction.findOne({
    where: { referenceId, transactionType },
    ...options,
  });
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — LIST ALL PAYMENTS
// ═══════════════════════════════════════════════════════════════
export const getAllPayments = async ({ page = 1, limit = 10 } = {}) => {
  return await WalletTransaction.findAndCountAll({
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — GET PAYMENT BY ID
// ═══════════════════════════════════════════════════════════════
export const getPaymentByIdRepository = async (id) => {
  return await WalletTransaction.findByPk(id);
};