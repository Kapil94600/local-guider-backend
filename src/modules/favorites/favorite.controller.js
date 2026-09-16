// src/modules/favorites/favorite.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import { addFavorite, fetchFavorites, deleteFavorite } from "./favorite.service.js";

export const createFavorite = async (req, res, next) => {
  try {
    // ✅ FIX: userId forced from authenticated user
    const favorite = await addFavorite({
      ...req.body,
      userId: req.user.id,
    });
    return ApiResponse.success(res, "Favorite added successfully", favorite);
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req, res, next) => {
  try {
    // ✅ FIX: use req.user.id, NOT req.params.userId
    const favorites = await fetchFavorites(req.user.id);
    return ApiResponse.success(res, "Favorites fetched successfully", favorites);
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    const result = await deleteFavorite(req.params.id, req.user.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};