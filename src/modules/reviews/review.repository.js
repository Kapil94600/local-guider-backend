// src/modules/reviews/review.repository.js
import { Op } from "sequelize";
import Review from "../../database/models/core/Review.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createReview = async (payload) => {
  return await Review.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: GET ALL with pagination + User include
// ═══════════════════════════════════════════════════════════════
export const getAllReviews = async ({
  page = 1,
  limit = 20,
  sortBy = "createdAt",
  sortOrder = "DESC",
} = {}) => {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);

  // ✅ Whitelist sort fields
  const ALLOWED_SORT = ["createdAt", "rating", "updatedAt"];
  const safeSortBy = ALLOWED_SORT.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  return await Review.findAndCountAll({
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "profileImage"],
        required: false,
      },
    ],
    order: [[safeSortBy, safeSortOrder]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    distinct: true,
  });
};

// ═══════════════════════════════════════════════════════════════
// GET BY ID — with User
// ═══════════════════════════════════════════════════════════════
export const getReviewById = async (id) => {
  return await Review.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "profileImage"],
        required: false,
      },
    ],
  });
};

// ═══════════════════════════════════════════════════════════════
// DUPLICATE CHECK — clean logic
// ═══════════════════════════════════════════════════════════════
export const findDuplicateReview = async (
  userId,
  guiderId,
  photographerId
) => {
  const where = { userId };

  if (guiderId) {
    where.guiderId = guiderId;
  } else if (photographerId) {
    where.photographerId = photographerId;
  } else {
    return null;
  }

  return await Review.findOne({ where });
};

// ═══════════════════════════════════════════════════════════════
// COMPLETED BOOKING CHECK
// ═══════════════════════════════════════════════════════════════
export const findCompletedBookingForProvider = async ({
  userId,
  guiderPlanIds = [],
  photographerPlanIds = [],
}) => {
  const Booking = (
    await import("../../database/models/core/Booking.js")
  ).default;

  const orConditions = [];
  if (guiderPlanIds.length > 0) {
    orConditions.push({ guiderPlanId: { [Op.in]: guiderPlanIds } });
  }
  if (photographerPlanIds.length > 0) {
    orConditions.push({
      photographerPlanId: { [Op.in]: photographerPlanIds },
    });
  }
  if (orConditions.length === 0) return null;

  return await Booking.findOne({
    where: {
      userId,
      status: "COMPLETED",
      [Op.or]: orConditions,
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
export const updateReviewById = async (id, payload) => {
  const review = await Review.findByPk(id);
  if (!review) return null;
  await review.update(payload);
  return review;
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const deleteReviewById = async (id) => {
  const review = await Review.findByPk(id);
  if (!review) return null;
  await review.destroy();
  return true;
};