import express from "express";
import {
  createPlace,
  getPlaces,
  getFeaturedPlaces,
  searchPlaces,
  getPlace,
  editPlace,
  deletePlace,
} from "./place.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Public Routes
router.get("/", getPlaces);
router.get("/featured", getFeaturedPlaces);
router.get("/search", searchPlaces);
router.get("/:id", getPlace);

// Admin Routes
router.post("/", authenticate, authorize("ADMIN"), createPlace);
router.put("/:id", authenticate, authorize("ADMIN"), editPlace);
router.delete("/:id", authenticate, authorize("ADMIN"), deletePlace);

export default router;