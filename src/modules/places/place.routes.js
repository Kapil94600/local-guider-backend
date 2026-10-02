// src/modules/places/place.routes.js
// ═══════════════════════════════════════════════════════════════
// PLACE ROUTES — public + admin
// ═══════════════════════════════════════════════════════════════
import express from "express";
import {
  createPlace,
  getPlaces,
  getNearbyPlacesHandler,     // ✅ Nearby
  getFeaturedPlaces,
  searchPlaces,
  getPlace,
  editPlace,
  deletePlace,
  addPlaceGalleryImage,
  removePlaceGalleryImage,
  replacePlaceGallery,
} from "./place.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════
router.get("/", getPlaces);

// ✅ Nearby places — MUST BE BEFORE /:id
router.get("/nearby", getNearbyPlacesHandler);

router.get("/featured", getFeaturedPlaces);
router.get("/search", searchPlaces);

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════
router.post("/", authenticate, authorize("ADMIN"), createPlace);
router.put("/:id", authenticate, authorize("ADMIN"), editPlace);
router.delete("/:id", authenticate, authorize("ADMIN"), deletePlace);

// Gallery routes
router.post(
  "/:id/gallery",
  authenticate,
  authorize("ADMIN"),
  addPlaceGalleryImage
);
router.delete(
  "/:id/gallery",
  authenticate,
  authorize("ADMIN"),
  removePlaceGalleryImage
);
router.put(
  "/:id/gallery",
  authenticate,
  authorize("ADMIN"),
  replacePlaceGallery
);

// ═══════════════════════════════════════════════════════════════
// /:id — MUST BE LAST (catch-all)
// ═══════════════════════════════════════════════════════════════
router.get("/:id", getPlace);

export default router;