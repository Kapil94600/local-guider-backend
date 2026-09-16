import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addPlace,
  fetchPlaces,
  fetchPlaceById,
  fetchFeaturedPlaces,
  searchPlacesService,
  updatePlace,
  removePlace,
} from "./place.service.js";

export const createPlace = async (req, res, next) => {
  try {
    const place = await addPlace(req.body);
    return ApiResponse.success(res, "Place created successfully", place, 201);
  } catch (error) {
    next(error);
  }
};

export const getPlaces = async (req, res, next) => {
  try {
    const { city, category, page = 1, limit = 10 } = req.query;
    const places = await fetchPlaces({ city, category, page, limit });
    return ApiResponse.success(res, "Places fetched successfully", places);
  } catch (error) {
    next(error);
  }
};

export const getFeaturedPlaces = async (req, res, next) => {
  try {
    const places = await fetchFeaturedPlaces();
    return ApiResponse.success(res, "Featured places fetched", places);
  } catch (error) {
    next(error);
  }
};

export const searchPlaces = async (req, res, next) => {
  try {
    const { q, city } = req.query;
    const places = await searchPlacesService(q, city);
    return ApiResponse.success(res, "Search results", places);
  } catch (error) {
    next(error);
  }
};

export const getPlace = async (req, res, next) => {
  try {
    const place = await fetchPlaceById(req.params.id);
    return ApiResponse.success(res, "Place fetched successfully", place);
  } catch (error) {
    next(error);
  }
};

export const editPlace = async (req, res, next) => {
  try {
    const place = await updatePlace(req.params.id, req.body);
    return ApiResponse.success(res, "Place updated successfully", place);
  } catch (error) {
    next(error);
  }
};

export const deletePlace = async (req, res, next) => {
  try {
    const result = await removePlace(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};