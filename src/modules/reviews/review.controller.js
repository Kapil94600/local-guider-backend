// src/modules/reviews/review.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addReview,
  fetchReviews,
  fetchReviewById,
  updateReview,
  removeReview,
} from "./review.service.js";

export const createReview = async (req, res, next) => {
  try {
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    // ✅ FIX: force userId from authenticated user
    const review = await addReview({
      ...req.body,
      userId: req.user.id,
      images,
    });
    return ApiResponse.success(res, "Review created successfully", review);
  } catch (error) {
    next(error);
  }
};

export const getReviews = async (req, res, next) => {
  try {
    const reviews = await fetchReviews();
    return ApiResponse.success(res, "Reviews fetched successfully", reviews);
  } catch (error) { next(error); }
};

export const getReview = async (req, res, next) => {
  try {
    const review = await fetchReviewById(req.params.id);
    return ApiResponse.success(res, "Review fetched successfully", review);
  } catch (error) { next(error); }
};

export const editReview = async (req, res, next) => {
  try {
    // ✅ FIX: only owner or admin can edit
    const review = await fetchReviewById(req.params.id);
    if (!review) throw new Error("Review not found");
    if (review.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const updated = await updateReview(req.params.id, req.body);
    return ApiResponse.success(res, "Review updated successfully", updated);
  } catch (error) { next(error); }
};

export const deleteReview = async (req, res, next) => {
  try {
    // ✅ FIX: only owner or admin can delete
    const review = await fetchReviewById(req.params.id);
    if (!review) throw new Error("Review not found");
    if (review.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const result = await removeReview(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};