// src/modules/reviews/review.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import {
  addReview,
  fetchReviews,
  fetchReviewById,
  updateReview,
  removeReview,
} from "./review.service.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════
// CREATE REVIEW with Cloudinary upload
// ═══════════════════════════════════════════
export const createReview = async (req, res, next) => {
  try {
    let images = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      try {
        images = await Promise.all(
          req.files.map((file) =>
            uploadToCloudinary(file.buffer, "local-guider/reviews")
          )
        );
      } catch (uploadErr) {
        logger.error(`Review image upload error: ${uploadErr.message}`);
        images = [];
      }
    }

    const review = await addReview({
      rating: req.body.rating,
      comment: req.body.comment,
      guiderId: req.body.guiderId || null,
      photographerId: req.body.photographerId || null,
      userId: req.user.id,
      images,
    });

    return ApiResponse.success(res, "Review created successfully", review);
  } catch (error) {
    logger.error(`createReview error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════
// ✅ FEATURE B-25: GET all reviews (paginated)
// ═══════════════════════════════════════════
export const getReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const reviews = await fetchReviews({ page, limit });
    return ApiResponse.success(
      res,
      "Reviews fetched successfully",
      reviews
    );
  } catch (error) {
    logger.error(`getReviews error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════
// GET single review
// ═══════════════════════════════════════════
export const getReview = async (req, res, next) => {
  try {
    const review = await fetchReviewById(req.params.id);
    return ApiResponse.success(res, "Review fetched successfully", review);
  } catch (error) {
    logger.error(`getReview error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════
// UPDATE review — owner or admin only
// ═══════════════════════════════════════════
export const editReview = async (req, res, next) => {
  try {
    const review = await fetchReviewById(req.params.id);
    if (!review) throw new Error("Review not found");

    if (review.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this review",
      });
    }

    const ALLOWED = ["rating", "comment", "images"];
    const safePayload = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) {
        safePayload[key] = req.body[key];
      }
    }

    const updated = await updateReview(req.params.id, safePayload);
    return ApiResponse.success(res, "Review updated successfully", updated);
  } catch (error) {
    logger.error(`editReview error: ${error.message}`);
    next(error);
  }
};

// ═══════════════════════════════════════════
// DELETE review — owner or admin only
// ═══════════════════════════════════════════
export const deleteReview = async (req, res, next) => {
  try {
    const review = await fetchReviewById(req.params.id);
    if (!review) throw new Error("Review not found");

    if (review.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }

    const result = await removeReview(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    logger.error(`deleteReview error: ${error.message}`);
    next(error);
  }
};