// src/modules/analytics/analytics.routes.js
import express from "express";
import {
  getBookingTrend,
  getRevenueTrend,
  getUserGrowth,
  getTopGuiders,
  getTopPhotographers,
  getBookingStatus,
} from "./analytics.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ✅ Admin only
router.use(authenticate, authorize("ADMIN"));

router.get("/booking-trend", getBookingTrend);
router.get("/revenue-trend", getRevenueTrend);
router.get("/user-growth", getUserGrowth);
router.get("/top-guiders", getTopGuiders);
router.get("/top-photographers", getTopPhotographers);
router.get("/booking-status", getBookingStatus);

export default router;