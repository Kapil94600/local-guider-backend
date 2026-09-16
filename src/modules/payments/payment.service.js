// src/modules/payments/payment.service.js
import Razorpay from "razorpay";
import crypto from "crypto";
import {
  getBookingById,
  updateBookingStatus,
  createTransaction,
  getAllPayments,
  getPaymentByIdRepository,
} from "./payment.repository.js";
import Wallet from "../../database/models/core/Wallet.js";
import { env } from "../../config/env.js";
import { addNotification } from "../notifications/notification.service.js";

let razorpay = null;
if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  console.log("✅ Razorpay configured");
} else {
  console.log("⚠️ Razorpay not configured — payment order creation will fail");
}

export const createRazorpayOrder = async (bookingId) => {
  if (!razorpay) throw new Error("Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  const amount = Math.round(booking.totalAmount * 100);
  const order = await razorpay.orders.create({ amount, currency: "INR", receipt: `booking_${booking.id}` });
  return { orderId: order.id, amount: booking.totalAmount };
};

export const verifyPaymentSignature = async ({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!razorpay) throw new Error("Razorpay not configured");
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
  if (expectedSignature !== razorpaySignature) throw new Error("Invalid signature");

  const wallet = await Wallet.findOne({ where: { userId: booking.userId } });
  if (!wallet) throw new Error("Wallet not found for this user");

  const newBalance = parseFloat(wallet.balance || 0) + parseFloat(booking.totalAmount || 0);

  const transaction = await createTransaction({
    walletId: wallet.id,
    transactionType: "CREDIT",
    amount: booking.totalAmount,
    balanceAfter: newBalance,
    referenceId: razorpayPaymentId,
    description: `Payment for booking ${booking.id}`,
  });

  await wallet.update({ balance: newBalance });

  const updatedBooking = await updateBookingStatus(booking.id, "APPROVED");

  await addNotification({
    userId: booking.userId,
    title: "Payment Successful",
    message: `Payment of ₹${booking.totalAmount} received for booking #${booking.id.slice(0, 8)}`,
    type: "PAYMENT",
    data: { bookingId: booking.id },
    channels: ["IN_APP", "PUSH", "EMAIL"],
    email: booking.User?.email,
  });

  return { booking: updatedBooking, transaction };
};

export const fetchAllPayments = async (params) => getAllPayments(params);

// ✅ Added
export const fetchPaymentById = async (id) => {
  const payment = await getPaymentByIdRepository(id);
  if (!payment) throw new Error("Payment not found");
  return payment;
};