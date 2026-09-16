// src/modules/withdrawal/withdrawal.routes.js
import express from "express";
import {
  createWithdrawalRequest,
  getMyWithdrawalRequests,
  getAllWithdrawalRequests,
  getWithdrawalRequestById,
  updateWithdrawalStatus,
} from "./withdrawal.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// User
router.post("/request", authenticate, createWithdrawalRequest);
router.get("/my", authenticate, getMyWithdrawalRequests);

// Admin
router.get("/all", authenticate, authorize("ADMIN"), getAllWithdrawalRequests);
// ✅ Added — GET by id (admin)
router.get("/:id", authenticate, authorize("ADMIN"), getWithdrawalRequestById);
router.put("/:id/status", authenticate, authorize("ADMIN"), updateWithdrawalStatus);

export default router;