// src/modules/bookings/booking.routes.js
import express from "express";
import {
  createBooking,
  getAllBookings,
  getBooking,
  updateStatus,
  getMyBookings,
  getGuiderBookings,
  getPhotographerBookings,
  cancelBooking,
  completeRequest,
  completeVerify,
} from "./booking.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js"; // ✅ Added

const router = express.Router();

router.post("/", authenticate, createBooking);
router.get("/my", authenticate, getMyBookings);
router.get("/guider", authenticate, getGuiderBookings);
router.get("/photographer", authenticate, getPhotographerBookings);
// ✅ FIX: Admin-only for all bookings
router.get("/", authenticate, authorize("ADMIN"), getAllBookings);
router.get("/:id", authenticate, getBooking);
router.put("/:id/status", authenticate, updateStatus);
router.post("/:id/cancel", authenticate, cancelBooking);
router.post("/:id/complete-request", authenticate, completeRequest);
router.post("/:id/complete-verify", authenticate, completeVerify);

export default router;