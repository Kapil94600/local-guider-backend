import express from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import walletRoutes from "../modules/wallet/wallet.routes.js";
import placeRoutes from "../modules/places/place.routes.js";
import guiderRoutes from "../modules/guiders/guider.routes.js";
import photographerRoutes from "../modules/photographers/photographer.routes.js";
import guiderPlanRoutes from "../modules/guiders/guiderPlan.routes.js";
import photographerPlanRoutes from "../modules/photographers/photographerPlan.routes.js";
import bookingRoutes from "../modules/bookings/booking.routes.js";
import reviewRoutes from "../modules/reviews/review.routes.js";
import favoriteRoutes from "../modules/favorites/favorite.routes.js";
import notificationRoutes from "../modules/notifications/notification.routes.js";
import uploadRoutes from "../modules/uploads/upload.routes.js";
import roleRequestRoutes from "../modules/roleRequests/roleRequest.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import paymentRoutes from "../modules/payments/payment.routes.js";
import idCardRoutes from "../modules/idCards/idCard.routes.js";
import offerRoutes from "../modules/offers/offer.routes.js";
import sliderRoutes from "../modules/sliders/slider.routes.js";
import chatRoutes from "../modules/chat/chat.routes.js";
import deviceRoutes from "../modules/devices/device.routes.js";
import analyticsRoutes from "../modules/analytics/analytics.routes.js";
import withdrawalRoutes from "../modules/withdrawal/withdrawal.routes.js";
import blockRoutes from "../modules/blocks/block.routes.js"; // ✅ ADDED
import adminNotificationRoutes from "../modules/notifications/adminNotification.routes.js";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/wallet", walletRoutes);
router.use("/places", placeRoutes);
router.use("/guiders", guiderRoutes);
router.use("/photographers", photographerRoutes);
router.use("/guider-plans", guiderPlanRoutes);
router.use("/photographer-plans", photographerPlanRoutes);
router.use("/bookings", bookingRoutes);
router.use("/reviews", reviewRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/notifications", notificationRoutes);
router.use("/uploads", uploadRoutes);
router.use("/role-requests", roleRequestRoutes);
router.use("/admin", adminRoutes);
router.use("/payments", paymentRoutes);
router.use("/id-cards", idCardRoutes);
router.use("/offers", offerRoutes);
router.use("/sliders", sliderRoutes);
router.use("/chat", chatRoutes);
router.use("/devices", deviceRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/withdrawal", withdrawalRoutes);
router.use("/blocks", blockRoutes); // ✅ ADDED
router.use("/admin/notifications", adminNotificationRoutes); // ✅ ADD THIS

export default router;