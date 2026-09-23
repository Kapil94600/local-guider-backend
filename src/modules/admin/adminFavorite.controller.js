import { ApiResponse } from "../../utils/apiResponse.js";

import {
  fetchFavorites,
  fetchFavorite,
  removeFavorite,
} from "./adminFavorite.service.js";

export const getFavorites = async (
  req,
  res,
  next
) => {
  try {
    const favorites =
      await fetchFavorites();

    return ApiResponse.success(
      res,
      "Favorites fetched successfully",
      favorites
    );
  } catch (error) {
    next(error);
  }
};

export const getFavorite = async (
  req,
  res,
  next
) => {
  try {
    const favorite =
      await fetchFavorite(
        req.params.id
      );

    return ApiResponse.success(
      res,
      "Favorite fetched successfully",
      favorite
    );
  } catch (error) {
    next(error);
  }
};

export const deleteFavorite =
  async (req, res, next) => {
    try {
      const result =
        await removeFavorite(
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