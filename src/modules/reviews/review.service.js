// src/modules/reviews/review.service.js
import {
  createReview,
  getAllReviews,
  getReviewById,
  findDuplicateReview,
  findCompletedBookingForProvider,
  updateReviewById,
  deleteReviewById,
} from "./review.repository.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import User from "../../database/models/core/User.js";
import { addNotification } from "../notifications/notification.service.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════
// Duplicate check
// ═══════════════════════════════════════════
const checkDuplicateReview = async (userId, guiderId, photographerId) => {
  return await findDuplicateReview(userId, guiderId, photographerId);
};

// ═══════════════════════════════════════════
// Completed booking check
// ═══════════════════════════════════════════
const checkCompletedBookingExists = async (
  userId,
  guiderId,
  photographerId
) => {
  let guiderPlanIds = [];
  let photographerPlanIds = [];

  if (guiderId) {
    const guiderPlans = await GuiderPlan.findAll({
      where: { guiderId },
      attributes: ["id"],
    });
    guiderPlanIds = guiderPlans.map((p) => p.id);
    if (guiderPlanIds.length === 0) return false;
  } else if (photographerId) {
    const photographerPlans = await PhotographerPlan.findAll({
      where: { photographerId },
      attributes: ["id"],
    });
    photographerPlanIds = photographerPlans.map((p) => p.id);
    if (photographerPlanIds.length === 0) return false;
  } else {
    return false;
  }

  const booking = await findCompletedBookingForProvider({
    userId,
    guiderPlanIds,
    photographerPlanIds,
  });

  return !!booking;
};

// ═══════════════════════════════════════════
// Resolve provider user ID
// ═══════════════════════════════════════════
const resolveProviderUserId = async (guiderId, photographerId) => {
  if (guiderId) {
    const guider = await Guider.findByPk(guiderId, {
      attributes: ["userId"],
    });
    return guider?.userId || null;
  }
  if (photographerId) {
    const photographer = await Photographer.findByPk(photographerId, {
      attributes: ["userId"],
    });
    return photographer?.userId || null;
  }
  return null;
};

// ═══════════════════════════════════════════
// ADD REVIEW
// ═══════════════════════════════════════════
export const addReview = async (payload) => {
  const { userId, guiderId, photographerId, rating } = payload;

  if (!userId) throw new Error("User ID required");
  if (!rating || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  if (!guiderId && !photographerId) {
    throw new Error("Either guiderId or photographerId is required");
  }

  const duplicate = await checkDuplicateReview(
    userId,
    guiderId,
    photographerId
  );
  if (duplicate) {
    throw new Error("You have already reviewed this provider");
  }

  const hasCompletedBooking = await checkCompletedBookingExists(
    userId,
    guiderId,
    photographerId
  );
  if (!hasCompletedBooking) {
    throw new Error(
      "You can only review providers after completing a booking with them"
    );
  }

  if (payload.images && !Array.isArray(payload.images)) {
    payload.images = [payload.images];
  }

  const review = await createReview(payload);

  const providerUserId = await resolveProviderUserId(
    guiderId,
    photographerId
  );

  if (providerUserId) {
    try {
      const customer = await User.findByPk(userId, {
        attributes: ["id", "firstName", "lastName"],
      });
      const customerName = customer
        ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
          "A customer"
        : "A customer";

      await addNotification({
        userId: providerUserId,
        title: `New ${rating}-Star Review ⭐`,
        message: `${customerName} left a ${rating}-star review${
          payload.comment
            ? `: "${payload.comment.slice(0, 50)}${
                payload.comment.length > 50 ? "..." : ""
              }"`
            : ""
        }`,
        type: "SYSTEM",
        data: {
          reviewId: review.id,
          rating: rating,
          guiderId: guiderId || null,
          photographerId: photographerId || null,
        },
      });
      logger.info(`📢 Provider notified of new review: ${review.id}`);
    } catch (notifErr) {
      logger.error(`Review notification failed: ${notifErr.message}`);
    }
  }

  return review;
};

// ═══════════════════════════════════════════
// ✅ FEATURE B-25: FETCH with pagination
// ═══════════════════════════════════════════
export const fetchReviews = async (params = {}) => {
  const result = await getAllReviews(params);
  return {
    rows: result.rows,
    count: result.count,
    page: parseInt(params.page) || 1,
    limit: parseInt(params.limit) || 20,
    totalPages: Math.ceil(
      result.count / (parseInt(params.limit) || 20)
    ),
  };
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