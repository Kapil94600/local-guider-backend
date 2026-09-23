// src/modules/payments/payment.service.js
import Razorpay from "razorpay";
import crypto from "crypto";
import { Op } from "sequelize";
import {
  getBookingById,
  createTransaction,
  getAllPayments,
  getPaymentByIdRepository,
} from "./payment.repository.js";
import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";
import Booking from "../../database/models/core/Booking.js";
import { env } from "../../config/env.js";
import { addNotification } from "../notifications/notification.service.js";
import { sequelize } from "../../config/database.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// LOW BALANCE THRESHOLD
// ═══════════════════════════════════════════════════════════════
const LOW_BALANCE_THRESHOLD = 100; // ₹100

// ═══════════════════════════════════════════════════════════════
// Razorpay init
// ═══════════════════════════════════════════════════════════════
let razorpay = null;
if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  logger.info("✅ Razorpay configured");
} else {
  logger.warn("⚠️ Razorpay not configured — order creation will fail");
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
};

const verifyWebhookSignature = (rawBody, signature) => {
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expectedSignature === signature;
};

const generateReceipt = (prefix, id) => {
  return `${prefix}_${String(id).slice(0, 32)}`;
};

// ═══════════════════════════════════════════════════════════════
// Low balance alert helper
// ═══════════════════════════════════════════════════════════════
const checkLowBalance = async (userId, newBalance) => {
  if (newBalance < LOW_BALANCE_THRESHOLD) {
    try {
      await addNotification({
        userId,
        title: "Low Wallet Balance ⚠️",
        message: `Your wallet balance is ₹${newBalance.toFixed(
          2
        )}. Add money to avoid booking failures.`,
        type: "PAYMENT",
        data: {
          balance: newBalance,
          threshold: LOW_BALANCE_THRESHOLD,
          source: "LOW_BALANCE_ALERT",
        },
        channels: ["IN_APP", "PUSH"],
      });
      logger.info(`⚠️ Low balance alert sent to user ${userId.slice(0, 8)}`);
    } catch (e) {
      logger.error(`Low balance notification failed: ${e.message}`);
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// CREATE RAZORPAY ORDER (booking)
// ═══════════════════════════════════════════════════════════════
export const createRazorpayOrder = async (bookingId, userId) => {
  if (!razorpay) {
    throw new Error(
      "Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
    );
  }

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  if (booking.userId !== userId) {
    throw new Error("You can only pay for your own bookings");
  }

  if (booking.status !== "APPROVED") {
    throw new Error(
      `Booking must be APPROVED by the provider before payment. Current status: ${booking.status}`
    );
  }

  const existingPayment = await WalletTransaction.findOne({
    where: {
      referenceId: booking.id,
      transactionType: "DEBIT",
    },
  });
  if (existingPayment) {
    throw new Error("Payment already made for this booking");
  }

  const amountInPaise = Math.round(parseFloat(booking.totalAmount) * 100);
  if (!amountInPaise || amountInPaise < 100) {
    throw new Error("Invalid booking amount (minimum ₹1)");
  }

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: generateReceipt("bk", booking.id),
    notes: {
      bookingId: booking.id,
      userId: booking.userId,
      type: "BOOKING",
    },
  });

  logger.info(
    `✅ Razorpay order created: ${order.id} for booking ${booking.id.slice(
      0,
      8
    )} — ₹${booking.totalAmount}`
  );

  return {
    orderId: order.id,
    amount: parseFloat(booking.totalAmount),
    currency: "INR",
    key: env.RAZORPAY_KEY_ID,
  };
};

// ═══════════════════════════════════════════════════════════════
// CREATE RAZORPAY ORDER (wallet top-up)
// ═══════════════════════════════════════════════════════════════
export const createRazorpayWalletOrder = async (amount, userId) => {
  if (!razorpay) {
    throw new Error("Razorpay not configured");
  }

  const parsedAmount = parseFloat(amount);
  if (!parsedAmount || parsedAmount < 10) {
    throw new Error("Minimum wallet top-up is ₹10");
  }
  if (parsedAmount > 100000) {
    throw new Error("Maximum wallet top-up is ₹100,000");
  }

  const amountInPaise = Math.round(parsedAmount * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: generateReceipt("wl", `${userId}-${Date.now()}`),
    notes: {
      userId,
      type: "WALLET_TOPUP",
      amount: parsedAmount,
    },
  });

  logger.info(
    `✅ Razorpay wallet order: ${order.id} | User: ${userId.slice(
      0,
      8
    )} | ₹${parsedAmount}`
  );

  return {
    orderId: order.id,
    amount: parsedAmount,
    currency: "INR",
    key: env.RAZORPAY_KEY_ID,
  };
};

// ═══════════════════════════════════════════════════════════════
// VERIFY BOOKING PAYMENT
// ═══════════════════════════════════════════════════════════════
export const verifyPaymentSignature = async ({
  bookingId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  userId,
}) => {
  if (!razorpay) throw new Error("Razorpay not configured");

  if (
    !bookingId ||
    !razorpayOrderId ||
    !razorpayPaymentId ||
    !razorpaySignature
  ) {
    throw new Error("Missing required payment fields");
  }

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  if (booking.userId !== userId) {
    throw new Error("Unauthorized — booking belongs to another user");
  }

  if (booking.status !== "APPROVED") {
    throw new Error(
      `Booking must be APPROVED before payment. Current: ${booking.status}`
    );
  }

  const isValid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );
  if (!isValid) {
    logger.error(`❌ Invalid signature for booking ${bookingId.slice(0, 8)}`);
    throw new Error("Invalid payment signature");
  }

  // ✅ AMOUNT CROSS-CHECK
  const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);
  const orderAmount = razorpayOrder.amount / 100;
  const expectedAmount = parseFloat(booking.totalAmount);

  if (Math.abs(orderAmount - expectedAmount) > 0.01) {
    logger.error(
      `❌ AMOUNT MISMATCH (confirm): Order ₹${orderAmount} vs Booking ₹${expectedAmount}`
    );
    throw new Error("Order amount does not match booking amount");
  }

  const alreadyProcessed = await WalletTransaction.findOne({
    where: {
      referenceId: booking.id,
      transactionType: "DEBIT",
    },
  });
  if (alreadyProcessed) {
    logger.info(`ℹ️ Booking ${bookingId.slice(0, 8)} already paid`);
    return {
      booking,
      transaction: alreadyProcessed,
      alreadyProcessed: true,
    };
  }

  const t = await sequelize.transaction();
  try {
    const lockedBooking = await Booking.findByPk(booking.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!lockedBooking) throw new Error("Booking disappeared");

    if (lockedBooking.status !== "APPROVED") {
      throw new Error("Booking status changed during payment");
    }

    const wallet = await Wallet.findOne({
      where: { userId: booking.userId },
      transaction: t,
    });
    if (!wallet) throw new Error("Wallet not found for user");

    const amount = parseFloat(booking.totalAmount);

    const transaction = await WalletTransaction.create(
      {
        walletId: wallet.id,
        transactionType: "DEBIT",
        amount: amount,
        balanceAfter: parseFloat(wallet.balance),
        referenceId: booking.id,
        description: `Razorpay payment for booking ${booking.id.slice(
          0,
          8
        )} | Order: ${razorpayOrderId} | Payment: ${razorpayPaymentId}`,
      },
      { transaction: t }
    );

    await lockedBooking.update(
      {
        status: "PAID",
        paymentStatus: "PAID",
        paymentMethod: "RAZORPAY",
        paidAt: new Date(),
        notes: `${
          lockedBooking.notes ? lockedBooking.notes + "\n" : ""
        }Paid via Razorpay on ${new Date().toISOString()}`,
      },
      { transaction: t }
    );

    await t.commit();

    logger.info(
      `✅ Payment verified: booking ${booking.id.slice(0, 8)} → PAID — ₹${amount}`
    );

    try {
      await addNotification({
        userId: booking.userId,
        title: "Payment Successful 🎉",
        message: `Payment of ₹${amount} received for booking #${booking.id.slice(
          0,
          8
        )}. Booking confirmed!`,
        type: "PAYMENT",
        data: { bookingId: booking.id, razorpayPaymentId, amount },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (e) {
      logger.error(`Customer notification failed: ${e.message}`);
    }

    try {
      const { resolveProviderUser } = await import(
        "../bookings/booking.service.js"
      );
      const providerUser = await resolveProviderUser(booking);
      if (providerUser) {
        await addNotification({
          userId: providerUser.id,
          title: "Booking Paid & Confirmed 💰",
          message: `Booking #${booking.id.slice(
            0,
            8
          )} has been paid. Customer will arrive on scheduled date.`,
          type: "BOOKING",
          data: { bookingId: booking.id, status: "PAID" },
          channels: ["IN_APP", "PUSH"],
        });
      }
    } catch (e) {
      logger.error(`Provider notification failed: ${e.message}`);
    }

    try {
      const { getIO } = await import("../../socket.js");
      const io = getIO?.();
      if (io) {
        io.to(`user:${booking.userId}`).emit("booking:paid", {
          bookingId: booking.id,
          status: "PAID",
        });
      }
    } catch (e) {
      logger.error(`Socket emit failed: ${e.message}`);
    }

    return {
      booking: await getBookingById(booking.id),
      transaction,
    };
  } catch (error) {
    await t.rollback();
    logger.error(`❌ Payment verification failed: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// VERIFY WALLET TOP-UP (SERVER-SIDE AMOUNT)
// ═══════════════════════════════════════════════════════════════
export const verifyWalletTopUp = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  userId,
}) => {
  if (!razorpay) throw new Error("Razorpay not configured");

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error("Missing required payment fields");
  }

  const isValid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );
  if (!isValid) {
    throw new Error("Invalid payment signature");
  }

  const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);
  if (!razorpayOrder) {
    throw new Error("Razorpay order not found");
  }

  const parsedAmount = razorpayOrder.amount / 100;

  if (!parsedAmount || parsedAmount < 10) {
    throw new Error("Invalid top-up amount");
  }

  if (razorpayOrder.notes?.userId !== userId) {
    logger.error(
      `❌ Wallet order ownership mismatch: Order user ${razorpayOrder.notes?.userId} vs Requester ${userId}`
    );
    throw new Error("Order does not belong to this user");
  }

  if (razorpayOrder.notes?.type !== "WALLET_TOPUP") {
    throw new Error("Invalid order type for wallet top-up");
  }

  const alreadyProcessed = await WalletTransaction.findOne({
    where: {
      referenceId: razorpayOrderId,
      transactionType: "CREDIT",
    },
  });
  if (alreadyProcessed) {
    logger.info(`ℹ️ Wallet top-up already processed: ${razorpayOrderId}`);
    return {
      transaction: alreadyProcessed,
      alreadyProcessed: true,
      newBalance: parseFloat(alreadyProcessed.balanceAfter),
      amount: parsedAmount,
    };
  }

  const t = await sequelize.transaction();
  try {
    const wallet = await Wallet.findOne({
      where: { userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!wallet) throw new Error("Wallet not found");

    const currentBalance = parseFloat(wallet.balance || 0);
    const newBalance = currentBalance + parsedAmount;

    await wallet.update({ balance: newBalance }, { transaction: t });

    const transaction = await WalletTransaction.create(
      {
        walletId: wallet.id,
        transactionType: "CREDIT",
        amount: parsedAmount,
        balanceAfter: newBalance,
        referenceId: razorpayOrderId,
        description: `Wallet top-up via Razorpay | Order: ${razorpayOrderId} | Payment: ${razorpayPaymentId}`,
      },
      { transaction: t }
    );

    await t.commit();

    logger.info(
      `✅ Wallet top-up: ₹${parsedAmount} | User: ${userId.slice(
        0,
        8
      )} | New balance: ₹${newBalance}`
    );

    try {
      await addNotification({
        userId,
        title: "Money Added 🎉",
        message: `₹${parsedAmount.toFixed(
          2
        )} added to your wallet successfully.`,
        type: "PAYMENT",
        data: { amount: parsedAmount, source: "WALLET_TOPUP" },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (e) {
      logger.error(`Top-up notification failed: ${e.message}`);
    }

    return {
      transaction,
      newBalance,
      amount: parsedAmount,
    };
  } catch (error) {
    await t.rollback();
    logger.error(`❌ Wallet top-up failed: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// PAY VIA WALLET (booking)
// ═══════════════════════════════════════════════════════════════
export const payBookingViaWallet = async (bookingId, userId) => {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  if (booking.userId !== userId) {
    throw new Error("You can only pay for your own bookings");
  }

  if (booking.status !== "APPROVED") {
    throw new Error(
      `Booking must be APPROVED by the provider before payment. Current: ${booking.status}`
    );
  }

  const existingPayment = await WalletTransaction.findOne({
    where: {
      referenceId: booking.id,
      transactionType: "DEBIT",
    },
  });
  if (existingPayment) {
    throw new Error("Payment already made for this booking");
  }

  const amount = parseFloat(booking.totalAmount);
  if (!amount || amount <= 0) {
    throw new Error("Invalid booking amount");
  }

  const t = await sequelize.transaction();
  try {
    const lockedBooking = await Booking.findByPk(booking.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!lockedBooking) throw new Error("Booking disappeared");

    if (lockedBooking.status !== "APPROVED") {
      throw new Error("Booking status changed during payment");
    }

    const wallet = await Wallet.findOne({
      where: { userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!wallet) throw new Error("Wallet not found");

    const currentBalance = parseFloat(wallet.balance || 0);
    if (currentBalance < amount) {
      throw new Error(
        `Insufficient wallet balance. Available: ₹${currentBalance.toFixed(
          2
        )}, Required: ₹${amount.toFixed(2)}`
      );
    }

    const newBalance = currentBalance - amount;

    await wallet.update({ balance: newBalance }, { transaction: t });

    const transaction = await WalletTransaction.create(
      {
        walletId: wallet.id,
        transactionType: "DEBIT",
        amount: amount,
        balanceAfter: newBalance,
        referenceId: booking.id,
        description: `Booking payment via wallet for #${booking.id.slice(0, 8)}`,
      },
      { transaction: t }
    );

    await lockedBooking.update(
      {
        status: "PAID",
        paymentStatus: "PAID",
        paymentMethod: "WALLET",
        paidAt: new Date(),
        notes: `${
          lockedBooking.notes ? lockedBooking.notes + "\n" : ""
        }Paid via Wallet on ${new Date().toISOString()}`,
      },
      { transaction: t }
    );

    await t.commit();

    logger.info(
      `✅ Wallet payment: booking ${booking.id.slice(
        0,
        8
      )} → PAID — ₹${amount} (balance: ₹${newBalance})`
    );

    try {
      await addNotification({
        userId: booking.userId,
        title: "Payment Successful 🎉",
        message: `₹${amount.toFixed(
          2
        )} paid from wallet for booking #${booking.id.slice(0, 8)}.`,
        type: "PAYMENT",
        data: { bookingId: booking.id, amount, source: "WALLET" },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (e) {
      logger.error(`Customer notification failed: ${e.message}`);
    }

    await checkLowBalance(booking.userId, newBalance);

    try {
      const { resolveProviderUser } = await import(
        "../bookings/booking.service.js"
      );
      const providerUser = await resolveProviderUser(booking);
      if (providerUser) {
        await addNotification({
          userId: providerUser.id,
          title: "Booking Paid & Confirmed 💰",
          message: `Booking #${booking.id.slice(
            0,
            8
          )} has been paid. Customer will arrive on scheduled date.`,
          type: "BOOKING",
          data: { bookingId: booking.id, status: "PAID" },
          channels: ["IN_APP", "PUSH"],
        });
      }
    } catch (e) {
      logger.error(`Provider notification failed: ${e.message}`);
    }

    try {
      const { getIO } = await import("../../socket.js");
      const io = getIO?.();
      if (io) {
        io.to(`user:${booking.userId}`).emit("booking:paid", {
          bookingId: booking.id,
          status: "PAID",
        });
      }
    } catch (e) {
      logger.error(`Socket emit failed: ${e.message}`);
    }

    return {
      booking: await getBookingById(booking.id),
      transaction,
      newBalance,
    };
  } catch (error) {
    await t.rollback();
    logger.error(`❌ Wallet payment failed: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// REFUND WALLET FOR BOOKING
// ═══════════════════════════════════════════════════════════════
export const refundWalletForBooking = async (
  booking,
  transaction = null
) => {
  const outerTxn = !transaction;
  const t = transaction || (await sequelize.transaction());

  try {
    const paymentTxn = await WalletTransaction.findOne({
      where: {
        referenceId: booking.id,
        transactionType: "DEBIT",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!paymentTxn) {
      logger.info(
        `ℹ️ No payment found for booking ${booking.id.slice(
          0,
          8
        )} — skipping refund`
      );
      if (outerTxn) await t.commit();
      return null;
    }

    const alreadyRefunded = await WalletTransaction.findOne({
      where: {
        referenceId: booking.id,
        transactionType: "REFUND",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (alreadyRefunded) {
      logger.info(
        `ℹ️ Booking ${booking.id.slice(0, 8)} already refunded — skipping`
      );
      if (outerTxn) await t.commit();
      return null;
    }

    const wallet = await Wallet.findOne({
      where: { userId: booking.userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!wallet) {
      logger.error(
        `❌ Wallet not found for user ${booking.userId} — refund failed`
      );
      if (outerTxn) await t.commit();
      return null;
    }

    const amount = parseFloat(paymentTxn.amount);
    const currentBalance = parseFloat(wallet.balance || 0);
    const newBalance = currentBalance + amount;

    const refundTxn = await WalletTransaction.create(
      {
        walletId: wallet.id,
        transactionType: "REFUND",
        amount: amount,
        balanceAfter: newBalance,
        referenceId: booking.id,
        description: `Refund (credited to wallet) for cancelled booking #${booking.id.slice(
          0,
          8
        )}`,
      },
      { transaction: t }
    );

    await wallet.update({ balance: newBalance }, { transaction: t });

    logger.info(
      `✅ Refunded ₹${amount} to user ${booking.userId.slice(
        0,
        8
      )} for booking ${booking.id.slice(0, 8)}`
    );

    if (outerTxn) await t.commit();
    return refundTxn;
  } catch (error) {
    if (outerTxn) await t.rollback();
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-6: RAZORPAY WEBHOOK HANDLER
// - payment.failed: DON'T set invalid paymentStatus: "FAILED"
//   Instead, log to booking.notes + notify user
// ═══════════════════════════════════════════════════════════════
export const handleRazorpayWebhook = async (rawBody, parsedBody, signature) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    logger.error("❌ RAZORPAY_WEBHOOK_SECRET not set");
    throw new Error("Webhook not configured");
  }

  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    logger.error("❌ Invalid webhook signature");
    throw new Error("Invalid webhook signature");
  }

  const event = parsedBody.event;
  logger.info(`📥 Razorpay webhook: ${event}`);

  if (event === "payment.captured" || event === "order.paid") {
    const payment = parsedBody.payload.payment.entity;
    const orderId = payment.order_id;
    const paymentId = payment.id;
    const bookingIdFromNotes = payment.notes?.bookingId;
    const userId = payment.notes?.userId;
    const paymentType = payment.notes?.type;

    // ── WALLET TOP-UP via webhook
    if (paymentType === "WALLET_TOPUP" && userId) {
      logger.info(`💳 Webhook: wallet top-up for user ${userId.slice(0, 8)}`);

      const alreadyProcessed = await WalletTransaction.findOne({
        where: { referenceId: orderId, transactionType: "CREDIT" },
      });

      if (alreadyProcessed) {
        logger.info(`ℹ️ Webhook: top-up already processed`);
        return { received: true, note: "Already processed" };
      }

      const webhookAmount = parseFloat(payment.amount) / 100;

      const t = await sequelize.transaction();
      try {
        const wallet = await Wallet.findOne({
          where: { userId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!wallet) {
          await t.rollback();
          logger.error(`❌ Wallet not found for user ${userId}`);
          return { received: true, note: "Wallet not found" };
        }

        const currentBalance = parseFloat(wallet.balance || 0);
        const newBalance = currentBalance + webhookAmount;

        await wallet.update({ balance: newBalance }, { transaction: t });

        await WalletTransaction.create(
          {
            walletId: wallet.id,
            transactionType: "CREDIT",
            amount: webhookAmount,
            balanceAfter: newBalance,
            referenceId: orderId,
            description: `Wallet top-up (webhook) | Order: ${orderId} | Payment: ${paymentId}`,
          },
          { transaction: t }
        );

        await t.commit();
        logger.info(`✅ Webhook: wallet credited ₹${webhookAmount}`);
      } catch (err) {
        await t.rollback();
        logger.error(`❌ Webhook wallet credit failed: ${err.message}`);
        throw err;
      }

      return { received: true };
    }

    // ── BOOKING PAYMENT via webhook
    if (!bookingIdFromNotes) {
      logger.error("❌ No bookingId in webhook notes");
      return { received: true, note: "No bookingId" };
    }

    logger.info(
      `💳 Webhook: payment ${paymentId} captured for booking ${bookingIdFromNotes.slice(
        0,
        8
      )}`
    );

    const booking = await Booking.findByPk(bookingIdFromNotes);
    if (!booking) {
      logger.error(`❌ Booking not found`);
      return { received: true, note: "Booking not found" };
    }

    const webhookAmount = parseFloat(payment.amount) / 100;
    const expectedAmount = parseFloat(booking.totalAmount);

    if (Math.abs(webhookAmount - expectedAmount) > 0.01) {
      logger.error(
        `❌ AMOUNT MISMATCH: Webhook ₹${webhookAmount} vs Booking ₹${expectedAmount}`
      );
      return {
        received: true,
        note: `Amount mismatch: paid ₹${webhookAmount}, expected ₹${expectedAmount}`,
      };
    }

    logger.info(`✅ Amount verified: ₹${webhookAmount}`);

    const existing = await WalletTransaction.findOne({
      where: {
        referenceId: booking.id,
        transactionType: "DEBIT",
      },
    });
    if (existing) {
      logger.info(`ℹ️ Webhook: booking already processed`);
      return { received: true, note: "Already processed" };
    }

    const t = await sequelize.transaction();
    try {
      const lockedBooking = await Booking.findByPk(booking.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!lockedBooking) {
        await t.rollback();
        return { received: true, note: "Booking disappeared" };
      }

      const wallet = await Wallet.findOne({
        where: { userId: lockedBooking.userId },
        transaction: t,
      });

      if (wallet) {
        await WalletTransaction.create(
          {
            walletId: wallet.id,
            transactionType: "DEBIT",
            amount: webhookAmount,
            balanceAfter: parseFloat(wallet.balance),
            referenceId: lockedBooking.id,
            description: `Razorpay webhook | Order: ${orderId} | Payment: ${paymentId}`,
          },
          { transaction: t }
        );
      }

      if (lockedBooking.status === "APPROVED") {
        await lockedBooking.update(
          {
            status: "PAID",
            paymentStatus: "PAID",
            paymentMethod: "RAZORPAY",
            paidAt: new Date(),
          },
          { transaction: t }
        );
      }

      await t.commit();
      logger.info(`✅ Webhook: booking marked PAID`);
    } catch (err) {
      await t.rollback();
      logger.error(`❌ Webhook transaction failed: ${err.message}`);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ FIX B-6: payment.failed — DON'T use invalid enum "FAILED"
  // Instead: log to booking.notes + notify user
  // ═══════════════════════════════════════════════════════════════
  if (event === "payment.failed") {
    const payment = parsedBody.payload.payment.entity;
    const bookingIdFromNotes = payment.notes?.bookingId;
    const paymentId = payment.id;
    const errorDescription =
      payment.error_description || payment.error_reason || "Unknown reason";

    if (bookingIdFromNotes) {
      try {
        const booking = await Booking.findByPk(bookingIdFromNotes);
        if (booking) {
          // ✅ Append to notes — DON'T change paymentStatus enum
          const failureNote = `\n[Payment Failed ${new Date().toISOString()}] Razorpay Payment ID: ${paymentId} — Reason: ${errorDescription}`;
          await booking.update({
            notes: `${booking.notes || ""}${failureNote}`,
          });

          await addNotification({
            userId: booking.userId,
            title: "Payment Failed",
            message: `Your payment for booking #${bookingIdFromNotes.slice(
              0,
              8
            )} failed. Please try again. Reason: ${errorDescription}`,
            type: "PAYMENT",
            data: {
              bookingId: bookingIdFromNotes,
              status: "FAILED",
              paymentId,
              reason: errorDescription,
            },
            channels: ["IN_APP", "PUSH"],
          });

          logger.warn(
            `⚠️ Booking ${bookingIdFromNotes.slice(
              0,
              8
            )} payment FAILED — ${errorDescription}`
          );
        }
      } catch (e) {
        logger.error(`Failed payment handling error: ${e.message}`);
      }
    }
  }

  if (event === "refund.processed") {
    logger.info(`💸 Refund processed:`, parsedBody.payload.refund.entity);
  }

  return { received: true };
};

// ═══════════════════════════════════════════════════════════════
// FETCH (Admin)
// ═══════════════════════════════════════════════════════════════
export const fetchAllPayments = async (params) => getAllPayments(params);

export const fetchPaymentById = async (id) => {
  const payment = await getPaymentByIdRepository(id);
  if (!payment) throw new Error("Payment not found");
  return payment;
};