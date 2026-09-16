import Favorite from "../../database/models/core/Favorite.js";

export const getAllFavorites = async () => {
  return await Favorite.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const getFavoriteById = async (id) => {
  return await Favorite.findByPk(id);
};

export const deleteFavoriteById = async (id) => {
  const favorite =
    await Favorite.findByPk(id);

  if (!favorite) {
    return null;
  }

  await favorite.destroy();

  return true;
};