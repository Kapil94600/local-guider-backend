import express from "express";
import { dashboardStats } from "./admin.controller.js";

import {
  createAdminUser, getUsers, getUser, updateUserStatus, deleteUser,
} from "./adminUser.controller.js";
import {
  getGuiders, getGuider, updateGuiderStatus, deleteGuider,
} from "./adminGuider.controller.js";
import {
  getFavorites, getFavorite, deleteFavorite,
} from "./adminFavorite.controller.js";
import {
  getPhotographers, getPhotographer, updatePhotographerStatus, deletePhotographer,
} from "./adminPhotographer.controller.js";
import {
  getPlaces, getPlace, createPlace, updatePlace, updatePlaceStatus, deletePlace,
} from "./adminPlace.controller.js";
import {
  getReviews, getReview, updateReviewStatus, deleteReview,
} from "./adminReview.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

// ✅ Role Request Controllers
import { getRoleRequests, updateRoleRequestStatus } from "./adminRoleRequest.controller.js";

// ✅ Notification admin controllers
import { sendBroadcast, getAllNotifications } from "../notifications/adminNotification.controller.js";
// ✅ Bookings & payments
import { getAllBookings, getBooking, updateStatus } from "../bookings/booking.controller.js";
import { getPayments } from "../payments/payment.controller.js";
// ✅ Slider & offer & idcard
import { getAllSliders, createSlider, updateSlider, deleteSlider } from "../sliders/slider.controller.js";
import { getAllOffers, createOffer, updateOffer, deleteOffer } from "../offers/offer.controller.js";
import { getIdCards, revokeIdCard } from "../idCards/idCard.controller.js";

// ✅ ✅ NEW: Admin guider / photographer create controllers
import { createGuider } from "../guiders/guider.controller.js";
import { createPhotographer } from "../photographers/photographer.controller.js";

const router = express.Router();

// Dashboard & Admin Create
router.get("/dashboard", authenticate, authorize("ADMIN"), dashboardStats);
router.post("/create", authenticate, authorize("ADMIN"), createAdminUser);

// Users
router.get("/users", authenticate, authorize("ADMIN"), getUsers);
router.get("/users/:id", authenticate, authorize("ADMIN"), getUser);
router.put("/users/:id/status", authenticate, authorize("ADMIN"), updateUserStatus);
router.delete("/users/:id", authenticate, authorize("ADMIN"), deleteUser);

// Guiders
router.get("/guiders", authenticate, authorize("ADMIN"), getGuiders);
router.post("/guiders", authenticate, authorize("ADMIN"), createGuider);   // ✅ NEW
router.get("/guiders/:id", authenticate, authorize("ADMIN"), getGuider);
router.put("/guiders/:id/status", authenticate, authorize("ADMIN"), updateGuiderStatus);
router.delete("/guiders/:id", authenticate, authorize("ADMIN"), deleteGuider);

// Photographers
router.get("/photographers", authenticate, authorize("ADMIN"), getPhotographers);
router.post("/photographers", authenticate, authorize("ADMIN"), createPhotographer);  // ✅ NEW
router.get("/photographers/:id", authenticate, authorize("ADMIN"), getPhotographer);
router.put("/photographers/:id/status", authenticate, authorize("ADMIN"), updatePhotographerStatus);
router.delete("/photographers/:id", authenticate, authorize("ADMIN"), deletePhotographer);

// Places (Admin CRUD)
router.get("/places", authenticate, authorize("ADMIN"), getPlaces);
router.get("/places/:id", authenticate, authorize("ADMIN"), getPlace);
router.post("/places", authenticate, authorize("ADMIN"), createPlace);
router.put("/places/:id", authenticate, authorize("ADMIN"), updatePlace);
router.put("/places/:id/status", authenticate, authorize("ADMIN"), updatePlaceStatus);
router.delete("/places/:id", authenticate, authorize("ADMIN"), deletePlace);

// Reviews
router.get("/reviews", authenticate, authorize("ADMIN"), getReviews);
router.get("/reviews/:id", authenticate, authorize("ADMIN"), getReview);
router.put("/reviews/:id/status", authenticate, authorize("ADMIN"), updateReviewStatus);
router.delete("/reviews/:id", authenticate, authorize("ADMIN"), deleteReview);

// Favorites
router.get("/favorites", authenticate, authorize("ADMIN"), getFavorites);
router.get("/favorites/:id", authenticate, authorize("ADMIN"), getFavorite);
router.delete("/favorites/:id", authenticate, authorize("ADMIN"), deleteFavorite);

// Role Requests (Admin)
router.get("/role-requests", authenticate, authorize("ADMIN"), getRoleRequests);
router.put("/role-requests/:id/status", authenticate, authorize("ADMIN"), updateRoleRequestStatus);

// Notifications
router.get("/notifications", authenticate, authorize("ADMIN"), getAllNotifications);
router.post("/notifications/send", authenticate, authorize("ADMIN"), sendBroadcast);

// Bookings
router.get("/bookings", authenticate, authorize("ADMIN"), getAllBookings);
router.get("/bookings/:id", authenticate, authorize("ADMIN"), getBooking);
router.put("/bookings/:id/status", authenticate, authorize("ADMIN"), updateStatus);

// Payments
router.get("/payments", authenticate, authorize("ADMIN"), getPayments);

// Sliders
router.get("/sliders", authenticate, authorize("ADMIN"), getAllSliders);
router.post("/sliders", authenticate, authorize("ADMIN"), createSlider);
router.put("/sliders/:id", authenticate, authorize("ADMIN"), updateSlider);
router.delete("/sliders/:id", authenticate, authorize("ADMIN"), deleteSlider);

// Offers
router.get("/offers", authenticate, authorize("ADMIN"), getAllOffers);
router.post("/offers", authenticate, authorize("ADMIN"), createOffer);
router.put("/offers/:id", authenticate, authorize("ADMIN"), updateOffer);
router.delete("/offers/:id", authenticate, authorize("ADMIN"), deleteOffer);

// ID Cards
router.get("/id-cards", authenticate, authorize("ADMIN"), getIdCards);
router.put("/id-cards/:id/revoke", authenticate, authorize("ADMIN"), revokeIdCard);

export default router;