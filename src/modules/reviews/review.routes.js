// src/modules/reviews/review.routes.js
import express from "express";
import {
  createReview,
  getReviews,
  getReview,
  editReview,
  deleteReview,
} from "./review.controller.js";
import { upload } from "../../middlewares/uploadMiddleware.js";
import { authenticate } from "../../middlewares/authMiddleware.js"; // ✅ Added

const router = express.Router();

// Public read
router.get("/", getReviews);
router.get("/:id", getReview);

// Protected write
router.post("/", authenticate, upload.array("images", 5), createReview);
router.put("/:id", authenticate, editReview);
router.delete("/:id", authenticate, deleteReview);

export default router;