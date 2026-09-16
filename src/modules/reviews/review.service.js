// src/modules/reviews/review.service.js
import {
  createReview,
  getAllReviews,
  getReviewById,
  updateReviewById,
  deleteReviewById,
} from "./review.repository.js";

export const addReview = async (payload) => {
  // Ensure images is an array
  if (payload.images && !Array.isArray(payload.images)) {
    payload.images = [payload.images];
  }
  return await createReview(payload);
};

export const fetchReviews = async () => {
  return await getAllReviews();
};

export const fetchReviewById = async (id) => {
  const review = await getReviewById(id);
  if (!review) throw new Error("Review not found");
  return review;
};

export const updateReview = async (id, payload) => {
  const review = await updateReviewById(id, payload);
  if (!review) throw new Error("Review not found");
  return review;
};

export const removeReview = async (id) => {
  const result = await deleteReviewById(id);
  if (!result) throw new Error("Review not found");
  return { message: "Review deleted successfully" };
};