// src/modules/reviews/review.repository.js
import Review from "../../database/models/core/Review.js";

export const createReview = async (payload) => {
  return await Review.create(payload);
};

export const getAllReviews = async () => {
  return await Review.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const getReviewById = async (id) => {
  return await Review.findByPk(id);
};

export const updateReviewById = async (id, payload) => {
  const review = await Review.findByPk(id);
  if (!review) return null;
  await review.update(payload);
  return review;
};

export const deleteReviewById = async (id) => {
  const review = await Review.findByPk(id);
  if (!review) return null;
  await review.destroy();
  return true;
};