// src/modules/admin/adminReview.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  fetchReviews,
  fetchReview,
  changeReviewStatus,
  removeReview,
} from "./adminReview.service.js";

// ═══════════════════════════════════════════════════════════════
// GET ALL REVIEWS — with filters + pagination
// Query params: page, limit, search, status, rating, sortBy, sortOrder
// ═══════════════════════════════════════════════════════════════
export const getReviews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      rating,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // ✅ Build filter params
    const filters = {
      page,
      limit,
      search: search?.trim() || undefined,
      status: status !== "ALL" ? status : undefined,
      rating: rating !== "ALL" ? parseInt(rating, 10) : undefined,
      sortBy,
      sortOrder,
    };

    const reviews = await fetchReviews(filters);
    return ApiResponse.success(res, "Reviews fetched successfully", reviews);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE REVIEW
// ═══════════════════════════════════════════════════════════════
export const getReview = async (req, res, next) => {
  try {
    const review = await fetchReview(req.params.id);
    return ApiResponse.success(res, "Review fetched successfully", review);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE REVIEW STATUS
// ═══════════════════════════════════════════════════════════════
export const updateReviewStatus = async (req, res, next) => {
  try {
    const review = await changeReviewStatus(req.params.id, req.body.isActive);
    return ApiResponse.success(
      res,
      "Review status updated successfully",
      review
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// DELETE REVIEW
// ═══════════════════════════════════════════════════════════════
export const deleteReview = async (req, res, next) => {
  try {
    const result = await removeReview(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};