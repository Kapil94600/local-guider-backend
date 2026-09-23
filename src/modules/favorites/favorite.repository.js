// src/modules/favorites/favorite.repository.js
import Favorite from "../../database/models/core/Favorite.js";

export const createFavorite = async (payload) => {
  return await Favorite.create(payload);
};

export const getFavorites = async (userId) => {
  return await Favorite.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
};

// ✅ FIX: scope to userId so no one can delete others' favorites
export const removeFavorite = async (id, userId) => {
  const favorite = await Favorite.findOne({ where: { id, userId } });
  if (!favorite) return null;
  await favorite.destroy();
  return true;
};