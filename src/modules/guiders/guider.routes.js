import express from "express";
import {
  createGuider,
  getGuiders,
  getTopGuiders,
  getGuider,
  getGuiderReviews,
  editGuider,
  deleteGuider,
  getGuiderPlans,
  getPlan,
  createGuiderPlan,
  updateGuiderPlan,
  deleteGuiderPlan,
  getGuiderPlaces,
  // ✅ Gallery
  addGuiderGalleryImage,
  removeGuiderGalleryImage,
  replaceGuiderGallery,
} from "./guider.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Public Routes
router.get("/", getGuiders);
router.get("/top", getTopGuiders);
router.get("/:id/reviews", getGuiderReviews);
router.get("/:id", getGuider);
router.get("/:id/places", getGuiderPlaces);

// Admin Routes
router.post("/", authenticate, authorize("ADMIN"), createGuider);
router.put("/:id", authenticate, authorize("GUIDER", "PHOTOGRAPHER", "ADMIN"), editGuider);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteGuider);

// ✅ Gallery Routes
router.post("/:id/gallery", authenticate, authorize("GUIDER", "ADMIN"), addGuiderGalleryImage);
router.delete("/:id/gallery", authenticate, authorize("GUIDER", "ADMIN"), removeGuiderGalleryImage);
router.put("/:id/gallery", authenticate, authorize("GUIDER", "ADMIN"), replaceGuiderGallery);

// Plans
router.use(authenticate);
router.get("/:id/plans", getGuiderPlans);
router.get("/plans/:planId", getPlan);
router.post("/:id/plans", authorize("GUIDER", "ADMIN"), createGuiderPlan);
router.put("/plans/:planId", authorize("GUIDER", "ADMIN"), updateGuiderPlan);
router.delete("/plans/:planId", authorize("GUIDER", "ADMIN"), deleteGuiderPlan);

export default router;