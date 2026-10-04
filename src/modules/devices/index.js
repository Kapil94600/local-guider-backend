// src/routes/index.js
import express from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import placeRoutes from "../modules/places/place.routes.js";
import bookingRoutes from "../modules/bookings/booking.routes.js";
import notificationRoutes from "../modules/notifications/notification.routes.js";
import adminNotificationRoutes from "../modules/notifications/adminNotification.routes.js";
import deviceRoutes from "../modules/devices/device.routes.js";  // ✅ NEW
// ... baaki imports

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════
router.use("/auth", authRoutes);
router.use("/places", placeRoutes);

// ═══════════════════════════════════════════════════════════════
// PROTECTED ROUTES
// ═══════════════════════════════════════════════════════════════
router.use("/users", userRoutes);
router.use("/bookings", bookingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/devices", deviceRoutes);  // ✅ NEW — Register karo

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════
router.use("/admin/notifications", adminNotificationRoutes);

// ... baaki routes

export default router;