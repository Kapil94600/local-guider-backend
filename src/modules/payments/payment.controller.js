// src/modules/payments/payment.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  createRazorpayOrder,
  createRazorpayWalletOrder,
  verifyPaymentSignature,
  verifyWalletTopUp,
  payBookingViaWallet,
  handleRazorpayWebhook,
  fetchAllPayments,
  fetchPaymentById,
} from "./payment.service.js";

// ═══════════════════════════════════════════════════════════════
// CREATE RAZORPAY ORDER (booking)
// ═══════════════════════════════════════════════════════════════
export const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }
    const order = await createRazorpayOrder(bookingId, req.user.id);
    return ApiResponse.success(res, "Order created", order);
  } catch (error) {
    console.error("❌ createOrder error:", error.message);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// CREATE WALLET TOP-UP ORDER
// ═══════════════════════════════════════════════════════════════
export const createWalletTopUpOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "amount is required",
      });
    }
    const order = await createRazorpayWalletOrder(amount, req.user.id);
    return ApiResponse.success(res, "Wallet order created", order);
  } catch (error) {
    console.error("❌ createWalletTopUpOrder error:", error.message);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// CONFIRM BOOKING PAYMENT (Razorpay)
// ═══════════════════════════════════════════════════════════════
export const confirmPayment = async (req, res, next) => {
  try {
    const {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (
      !bookingId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment fields",
      });
    }

    const result = await verifyPaymentSignature({
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId: req.user.id,
    });

    return ApiResponse.success(
      res,
      result.alreadyProcessed
        ? "Payment already verified"
        : "Payment confirmed successfully",
      result
    );
  } catch (error) {
    console.error("❌ confirmPayment error:", error.message);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-1: CONFIRM WALLET TOP-UP — amount NOT from client
// ═══════════════════════════════════════════════════════════════
export const confirmWalletTopUp = async (req, res, next) => {
  try {
    // ✅ Only signature data — NEVER accept `amount` from client
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment fields",
      });
    }

    const result = await verifyWalletTopUp({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId: req.user.id,
      // ❌ amount removed — server fetches from Razorpay
    });

    return ApiResponse.success(
      res,
      result.alreadyProcessed
        ? "Top-up already verified"
        : "Wallet top-up successful",
      result
    );
  } catch (error) {
    console.error("❌ confirmWalletTopUp error:", error.message);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PAY VIA WALLET (booking)
// ═══════════════════════════════════════════════════════════════
export const payViaWallet = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }
    const result = await payBookingViaWallet(bookingId, req.user.id);
    return ApiResponse.success(res, "Payment successful", result);
  } catch (error) {
    console.error("❌ payViaWallet error:", error.message);
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// RAZORPAY WEBHOOK (RAW BODY REQUIRED)
// ═══════════════════════════════════════════════════════════════
export const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing signature" });
    }

    // ✅ req.body MUST be a Buffer (raw)
    const rawBody = req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.error("❌ Webhook body is not a Buffer");
      return res
        .status(400)
        .json({ success: false, message: "Invalid body format" });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody.toString("utf8"));
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON" });
    }

    const result = await handleRazorpayWebhook(rawBody, parsedBody, signature);

    return res.status(200).json({ success: true, received: true, ...result });
  } catch (error) {
    console.error("❌ razorpayWebhook error:", error.message);
    return res.status(200).json({
      success: false,
      received: true,
      message: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET ALL PAYMENTS (Admin)
// ═══════════════════════════════════════════════════════════════
export const getPayments = async (req, res, next) => {
  try {
    const payments = await fetchAllPayments(req.query);
    return ApiResponse.success(res, "Payments fetched", payments);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET PAYMENT BY ID (Admin)
// ═══════════════════════════════════════════════════════════════
export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await fetchPaymentById(req.params.id);
    return ApiResponse.success(res, "Payment fetched", payment);
  } catch (error) {
    next(error);
  }
};