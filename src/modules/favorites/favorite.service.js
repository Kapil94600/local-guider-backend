// src/modules/favorites/favorite.service.js
import {
  createFavorite,
  getFavorites,
  removeFavorite,
} from "./favorite.repository.js";

export const addFavorite = async (payload) => {
  return await createFavorite(payload);
};

export const fetchFavorites = async (userId) => {
  return await getFavorites(userId);
};

// ✅ FIX: accept userId for ownership check
export const deleteFavorite = async (id, userId) => {
  const result = await removeFavorite(id, userId);
  if (!result) throw new Error("Favorite not found");
  return { message: "Favorite removed successfully" };
};