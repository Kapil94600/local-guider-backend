import { ApiResponse } from "../../utils/apiResponse.js";
import {
  fetchPlaces,
  fetchPlace,
  addPlace,               // ✅ Add
  editPlace,              // ✅ Add
  changePlaceStatus,
  removePlace,
} from "./adminPlace.service.js";

export const getPlaces = async (req, res, next) => {
  try {
    const places = await fetchPlaces();
    return ApiResponse.success(res, "Places fetched successfully", places);
  } catch (error) { next(error); }
};

export const getPlace = async (req, res, next) => {
  try {
    const place = await fetchPlace(req.params.id);
    return ApiResponse.success(res, "Place fetched successfully", place);
  } catch (error) { next(error); }
};

// ✅ New: Create Place
export const createPlace = async (req, res, next) => {
  try {
    const place = await addPlace(req.body);
    return ApiResponse.success(res, "Place created successfully", place, 201);
  } catch (error) { next(error); }
};

// ✅ New: Update Place
export const updatePlace = async (req, res, next) => {
  try {
    const place = await editPlace(req.params.id, req.body);
    return ApiResponse.success(res, "Place updated successfully", place);
  } catch (error) { next(error); }
};

export const updatePlaceStatus = async (req, res, next) => {
  try {
    const place = await changePlaceStatus(req.params.id, req.body.isActive);
    return ApiResponse.success(res, "Place status updated successfully", place);
  } catch (error) { next(error); }
};

export const deletePlace = async (req, res, next) => {
  try {
    const result = await removePlace(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};