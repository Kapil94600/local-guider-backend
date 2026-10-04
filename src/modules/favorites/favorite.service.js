// src/modules/favorites/favorite.service.js
// ═══════════════════════════════════════════════════════════════
// FAVORITES SERVICE
// ═══════════════════════════════════════════════════════════════
import {
  createFavorite,
  getFavorites,
  removeFavorite,
} from "./favorite.repository.js";

// ═══════════════════════════════════════════════════════════════
// ✅ ADD — idempotent (no duplicates ever)
// ═══════════════════════════════════════════════════════════════
export const addFavorite = async (payload) => {
  // Basic validation
  if (!payload.userId) throw new Error("userId is required");
  if (!payload.type) throw new Error("type is required");
  if (!payload.referenceId) throw new Error("referenceId is required");

  const validTypes = ["PLACE", "GUIDER", "PHOTOGRAPHER"];
  if (!validTypes.includes(payload.type)) {
    throw new Error("Invalid favorite type");
  }

  return await createFavorite(payload);
};

// ═══════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════
export const fetchFavorites = async (userId) => {
  return await getFavorites(userId);
};

// ═══════════════════════════════════════════════════════════════
// DELETE — scoped to userId
// ═══════════════════════════════════════════════════════════════
export const deleteFavorite = async (id, userId) => {
  const result = await removeFavorite(id, userId);
  if (!result) throw new Error("Favorite not found");
  return { message: "Favorite removed successfully" };
};