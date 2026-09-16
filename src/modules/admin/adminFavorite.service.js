import {
  getAllFavorites,
  getFavoriteById,
  deleteFavoriteById,
} from "./adminFavorite.repository.js";

export const fetchFavorites = async () => {
  return await getAllFavorites();
};

export const fetchFavorite = async (id) => {
  const favorite =
    await getFavoriteById(id);

  if (!favorite) {
    throw new Error(
      "Favorite not found"
    );
  }

  return favorite;
};

export const removeFavorite = async (
  id
) => {
  const result =
    await deleteFavoriteById(id);

  if (!result) {
    throw new Error(
      "Favorite not found"
    );
  }

  return {
    message:
      "Favorite deleted successfully",
  };
};