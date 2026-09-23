// src/modules/payments/payment.routes.js
import express from "express";
import {
  createOrder,
  createWalletTopUpOrder,
  confirmPayment,
  confirmWalletTopUp,
  payViaWallet,
  razorpayWebhook,
  getPayments,
  getPaymentById,
} from "./payment.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ─── Booking payment (Razorpay) ───
router.post("/create-order", authenticate, createOrder);
router.post("/confirm", authenticate, confirmPayment);

// ─── ✅ NEW: Wallet top-up (Razorpay) ───
router.post("/wallet/create-order", authenticate, createWalletTopUpOrder);
router.post("/wallet/confirm", authenticate, confirmWalletTopUp);

// ─── Booking payment (Wallet) ───
router.post("/booking/pay-via-wallet", authenticate, payViaWallet);

// ─── Razorpay Webhook (NO auth — signature verified) ───
router.post("/webhook", razorpayWebhook);

// ─── Admin ───
router.get("/admin", authenticate, authorize("ADMIN"), getPayments);
router.get("/admin/:id", authenticate, authorize("ADMIN"), getPaymentById);

export default router;