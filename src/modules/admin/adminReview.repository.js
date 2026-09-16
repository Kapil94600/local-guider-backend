import Review from "../../database/models/core/Review.js";

export const getAllReviews = async () => {
  return await Review.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const getReviewById = async (id) => {
  return await Review.findByPk(id);
};

export const updateReviewStatus = async (
  id,
  isActive
) => {
  const review = await Review.findByPk(id);

  if (!review) {
    return null;
  }

  await review.update({
    isActive,
  });

  return review;
};

export const deleteReviewById = async (
  id
) => {
  const review = await Review.findByPk(id);

  if (!review) {
    return null;
  }

  await review.destroy();

  return true;
};