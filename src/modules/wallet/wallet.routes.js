// src/modules/wallet/wallet.routes.js
import express from "express";
import {
  wallet,
  transactions,
  getAllWallets,
  updateWalletBalance,
} from "./wallet.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════════
router.get("/", authenticate, wallet);
router.get("/transactions", authenticate, transactions);

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════
router.get("/all", authenticate, authorize("ADMIN"), getAllWallets);
router.put(
  "/:userId/balance",
  authenticate,
  authorize("ADMIN"),
  updateWalletBalance
);

export default router;