// src/modules/bookings/booking.routes.js
import express from "express";
import {
  createBooking,
  getAllBookings,
  getBooking,
  getBookingWithHistory,   // ✅ NEW
  updateStatus,
  getMyBookings,
  getGuiderBookings,
  getPhotographerBookings,
  cancelBooking,
  completeRequest,
  completeVerify,
} from "./booking.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { userRateLimit } from "../../middlewares/userRateLimiter.js";  // ✅ NEW

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// CUSTOMER ROUTES
// ═══════════════════════════════════════════════════════════════
// ✅ Rate limited: 5 bookings per minute
router.post(
  "/",
  authenticate,
  userRateLimit({ windowMs: 60 * 1000, max: 5 }),
  createBooking
);
router.get("/my", authenticate, getMyBookings);
router.post("/:id/cancel", authenticate, cancelBooking);

// ═══════════════════════════════════════════════════════════════
// PROVIDER ROUTES
// ═══════════════════════════════════════════════════════════════
router.get("/guider", authenticate, getGuiderBookings);
router.get("/photographer", authenticate, getPhotographerBookings);

router.put("/:id/status", authenticate, updateStatus);
router.post("/:id/complete-request", authenticate, completeRequest);
router.post("/:id/complete-verify", authenticate, completeVerify);

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════
router.get("/", authenticate, authorize("ADMIN"), getAllBookings);

// ✅ FEATURE B-20: With status history (admin)
router.get(
  "/:id/with-history",
  authenticate,
  authorize("ADMIN"),
  getBookingWithHistory
);

// ═══════════════════════════════════════════════════════════════
// GENERIC — MUST BE LAST (catch-all)
// ═══════════════════════════════════════════════════════════════
router.get("/:id", authenticate, getBooking);

export default router;