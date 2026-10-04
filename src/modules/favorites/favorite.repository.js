// src/modules/favorites/favorite.repository.js
// ═══════════════════════════════════════════════════════════════
// FAVORITES REPOSITORY — with idempotent create
// ═══════════════════════════════════════════════════════════════
import Favorite from "../../database/models/core/Favorite.js";

// ═══════════════════════════════════════════════════════════════
// ✅ IDEMPOTENT CREATE
//    If favorite already exists (same user + type + ref),
//    return the existing one instead of creating duplicate.
// ═══════════════════════════════════════════════════════════════
export const createFavorite = async (payload) => {
  const { userId, type, referenceId } = payload;

  // Check if already exists
  const existing = await Favorite.findOne({
    where: { userId, type, referenceId },
  });

  if (existing) {
    return existing;
  }

  // Try to create — unique constraint is our safety net
  try {
    return await Favorite.create(payload);
  } catch (err) {
    // Race condition: another request created it in the meantime
    if (err.name === "SequelizeUniqueConstraintError") {
      return await Favorite.findOne({
        where: { userId, type, referenceId },
      });
    }
    throw err;
  }
};

// ═══════════════════════════════════════════════════════════════
// GET ALL
// ═══════════════════════════════════════════════════════════════
export const getFavorites = async (userId) => {
  return await Favorite.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// ✅ REMOVE — scoped to userId
// ═══════════════════════════════════════════════════════════════
export const removeFavorite = async (id, userId) => {
  const favorite = await Favorite.findOne({ where: { id, userId } });
  if (!favorite) return null;
  await favorite.destroy();
  return true;
};

// ═══════════════════════════════════════════════════════════════
// ✅ REMOVE BY (userId, type, referenceId) — for bulk cleanup
// ═══════════════════════════════════════════════════════════════
export const removeFavoriteByRef = async (userId, type, referenceId) => {
  return await Favorite.destroy({
    where: { userId, type, referenceId },
  });
};