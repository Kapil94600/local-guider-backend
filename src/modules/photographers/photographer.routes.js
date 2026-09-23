import express from "express";
import {
  createPhotographer,
  getPhotographers,
  getPhotographer,
  editPhotographer,
  deletePhotographer,
  getPhotographerPlaces,
  // ✅ Gallery
  addPhotographerGalleryImage,
  removePhotographerGalleryImage,
  replacePhotographerGallery,
} from "./photographer.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Public Routes
router.get("/", getPhotographers);
router.get("/:id", getPhotographer);
router.get("/:id/places", getPhotographerPlaces);

// Admin / Protected Routes
router.post("/", authenticate, authorize("ADMIN"), createPhotographer);
router.put("/:id", authenticate, authorize("PHOTOGRAPHER", "ADMIN"), editPhotographer);
router.delete("/:id", authenticate, authorize("ADMIN"), deletePhotographer);

// ✅ Gallery Routes
router.post("/:id/gallery", authenticate, authorize("PHOTOGRAPHER", "ADMIN"), addPhotographerGalleryImage);
router.delete("/:id/gallery", authenticate, authorize("PHOTOGRAPHER", "ADMIN"), removePhotographerGalleryImage);
router.put("/:id/gallery", authenticate, authorize("PHOTOGRAPHER", "ADMIN"), replacePhotographerGallery);

export default router;