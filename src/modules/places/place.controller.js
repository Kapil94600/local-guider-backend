// src/modules/places/place.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addPlace,
  fetchPlaces,
  fetchPlaceById,
  fetchFeaturedPlaces,
  searchPlacesService,
  updatePlace,
  removePlace,
  // ✅ Gallery
  addGallery,
  removeGallery,
  updateGallery,
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

// ═══════════════════════════════════════════
// ✅ GALLERY controllers
// ═══════════════════════════════════════════
export const addPlaceGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "imageUrl is required" });
    }
    const place = await addGallery(req.params.id, imageUrl);
    return ApiResponse.success(res, "Image added to gallery", place);
  } catch (error) {
    next(error);
  }
};

export const removePlaceGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    const place = await removeGallery(req.params.id, imageUrl);
    return ApiResponse.success(res, "Image removed from gallery", place);
  } catch (error) {
    next(error);
  }
};

export const replacePlaceGallery = async (req, res, next) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images)) {
      return res.status(400).json({ success: false, message: "images must be an array" });
    }
    const place = await updateGallery(req.params.id, images);
    return ApiResponse.success(res, "Gallery updated", place);
  } catch (error) {
    next(error);
  }
};