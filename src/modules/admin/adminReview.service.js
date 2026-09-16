import {
  getAllReviews,
  getReviewById,
  updateReviewStatus,
  deleteReviewById,
} from "./adminReview.repository.js";

export const fetchReviews = async () => {
  return await getAllReviews();
};

export const fetchReview = async (id) => {
  const review = await getReviewById(id);

  if (!review) {
    throw new Error("Review not found");
  }

  return review;
};

export const changeReviewStatus = async (
  id,
  isActive
) => {
  if (typeof isActive !== "boolean") {
    throw new Error(
      "isActive must be true or false"
    );
  }

  const review = await updateReviewStatus(
    id,
    isActive
  );

  if (!review) {
    throw new Error("Review not found");
  }

  return review;
};

export const removeReview = async (id) => {
  const result =
    await deleteReviewById(id);

  if (!result) {
    throw new Error("Review not found");
  }

  return {
    message: "Review deleted successfully",
  };
};