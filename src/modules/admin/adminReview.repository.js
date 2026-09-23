// src/modules/admin/adminReview.repository.js
import { Op } from "sequelize";
import Review from "../../database/models/core/Review.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════════════════════════
// ✅ getAllReviews — with filters + pagination + includes
// ═══════════════════════════════════════════════════════════════
export const getAllReviews = async ({
  page = 1,
  limit = 10,
  search,
  status,
  rating,
  sortBy = "createdAt",
  sortOrder = "DESC",
} = {}) => {
  const where = {};

  // ✅ Status filter (isActive)
  if (status === "true") where.isActive = true;
  else if (status === "false") where.isActive = false;

  // ✅ Rating filter
  if (rating && rating >= 1 && rating <= 5) {
    where.rating = rating;
  }

  // ✅ Search by comment (SQL-level)
  if (search && search.trim()) {
    where.comment = { [Op.iLike]: `%${search.trim()}%` };
  }

  // ✅ Whitelist sort fields
  const ALLOWED_SORT = ["createdAt", "rating", "updatedAt"];
  const safeSortBy = ALLOWED_SORT.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  return await Review.findAndCountAll({
    where,
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "email", "profileImage"],
      },
    ],
    order: [[safeSortBy, safeSortOrder]],
    limit: safeLimit,
    offset,
    distinct: true,
  });
};

// ═══════════════════════════════════════════════════════════════
// ✅ getReviewById
// ═══════════════════════════════════════════════════════════════
export const getReviewById = async (id) => {
  return await Review.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "email", "profileImage"],
      },
    ],
  });
};

// ═══════════════════════════════════════════════════════════════
// ✅ updateReviewStatus
// ═══════════════════════════════════════════════════════════════
export const updateReviewStatus = async (id, isActive) => {
  const review = await Review.findByPk(id);
  if (!review) return null;
  await review.update({ isActive });
  return review;
};

// ═══════════════════════════════════════════════════════════════
// ✅ deleteReviewById
// ═══════════════════════════════════════════════════════════════
export const deleteReviewById = async (id) => {
  const review = await Review.findByPk(id);
  if (!review) return null;
  await review.destroy();
  return true;
};