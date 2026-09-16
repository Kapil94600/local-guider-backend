// src/modules/payments/payment.repository.js
import Booking from "../../database/models/core/Booking.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";

export const getBookingById = async (id) => {
  return await Booking.findByPk(id, { include: ["User"] });
};

export const updateBookingStatus = async (id, status) => {
  const booking = await Booking.findByPk(id);
  if (!booking) return null;
  await booking.update({ status });
  return booking;
};

export const createTransaction = async (payload) => {
  return await WalletTransaction.create(payload);
};

export const getTransactionByReference = async (referenceId) => {
  return await WalletTransaction.findOne({ where: { referenceId } });
};

export const getAllPayments = async ({ page = 1, limit = 10 } = {}) => {
  return await WalletTransaction.findAndCountAll({
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
};

// ✅ Added
export const getPaymentByIdRepository = async (id) => {
  return await WalletTransaction.findByPk(id);
};