// src/modules/payments/payment.routes.js
import express from "express";
import {
  confirmPayment,
  getPayments,
  getPaymentById,
  createOrder,
} from "./payment.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router.post("/create-order", authenticate, createOrder);
router.post("/confirm", authenticate, confirmPayment);
router.get("/admin", authenticate, authorize("ADMIN"), getPayments);
// ✅ Added
router.get("/admin/:id", authenticate, authorize("ADMIN"), getPaymentById);

export default router;