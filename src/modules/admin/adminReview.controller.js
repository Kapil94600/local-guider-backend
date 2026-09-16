import { ApiResponse } from "../../utils/apiResponse.js";

import {
  fetchReviews,
  fetchReview,
  changeReviewStatus,
  removeReview,
} from "./adminReview.service.js";

export const getReviews = async (
  req,
  res,
  next
) => {
  try {
    const reviews = await fetchReviews();

    return ApiResponse.success(
      res,
      "Reviews fetched successfully",
      reviews
    );
  } catch (error) {
    next(error);
  }
};

export const getReview = async (
  req,
  res,
  next
) => {
  try {
    const review = await fetchReview(
      req.params.id
    );

    return ApiResponse.success(
      res,
      "Review fetched successfully",
      review
    );
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus =
  async (req, res, next) => {
    try {
      const review =
        await changeReviewStatus(
          req.params.id,
          req.body.isActive
        );

      return ApiResponse.success(
        res,
        "Review status updated successfully",
        review
      );
    } catch (error) {
      next(error);
    }
  };

export const deleteReview = async (
  req,
  res,
  next
) => {
  try {
    const result = await removeReview(
      req.params.id
    );

    return ApiResponse.success(
      res,
      result.message,
      null
    );
  } catch (error) {
    next(error);
  }
};