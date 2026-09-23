// src/modules/photographers/photographer.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addPhotographer,
  fetchPhotographers,
  fetchPhotographerById,
  updatePhotographer,
  removePhotographer,
  fetchPhotographerPlaces,
  addGallery,
  removeGallery,
  updateGallery,
} from "./photographer.service.js";

// ✅ HELPER: Verify caller is photographer owner OR admin
const verifyPhotographerOwnership = (photographer, user) => {
  if (!photographer) throw new Error("Photographer not found");
  if (user.role === "ADMIN") return true;
  if (photographer.userId === user.id) return true;
  throw new Error("You can only manage your own profile");
};

export const createPhotographer = async (req, res, next) => {
  try {
    const photographer = await addPhotographer(req.body);
    return ApiResponse.success(
      res,
      "Photographer created successfully",
      photographer
    );
  } catch (error) {
    next(error);
  }
};

export const getPhotographers = async (req, res, next) => {
  try {
    const photographers = await fetchPhotographers(req.query);
    return ApiResponse.success(
      res,
      "Photographers fetched successfully",
      photographers
    );
  } catch (error) {
    next(error);
  }
};

export const getPhotographer = async (req, res, next) => {
  try {
    const photographer = await fetchPhotographerById(req.params.id);
    return ApiResponse.success(
      res,
      "Photographer fetched successfully",
      photographer
    );
  } catch (error) {
    next(error);
  }
};

export const getPhotographerPlaces = async (req, res, next) => {
  try {
    const places = await fetchPhotographerPlaces(req.params.id);
    return ApiResponse.success(res, "Photographer places fetched", places);
  } catch (error) {
    next(error);
  }
};

// ✅ Ownership enforced
export const editPhotographer = async (req, res, next) => {
  try {
    const photographer = await fetchPhotographerById(req.params.id);
    verifyPhotographerOwnership(photographer, req.user);

    const updated = await updatePhotographer(req.params.id, req.body);
    return ApiResponse.success(
      res,
      "Photographer updated successfully",
      updated
    );
  } catch (error) {
    next(error);
  }
};

export const deletePhotographer = async (req, res, next) => {
  try {
    const result = await removePhotographer(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};

// ✅ Gallery — ownership enforced
export const addPhotographerGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res
        .status(400)
        .json({ success: false, message: "imageUrl is required" });
    }

    const photographer = await fetchPhotographerById(req.params.id);
    verifyPhotographerOwnership(photographer, req.user);

    const updated = await addGallery(req.params.id, imageUrl);
    return ApiResponse.success(res, "Image added to gallery", updated);
  } catch (error) {
    next(error);
  }
};

export const removePhotographerGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;

    const photographer = await fetchPhotographerById(req.params.id);
    verifyPhotographerOwnership(photographer, req.user);

    const updated = await removeGallery(req.params.id, imageUrl);
    return ApiResponse.success(res, "Image removed from gallery", updated);
  } catch (error) {
    next(error);
  }
};

export const replacePhotographerGallery = async (req, res, next) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images)) {
      return res
        .status(400)
        .json({ success: false, message: "images must be an array" });
    }

    const photographer = await fetchPhotographerById(req.params.id);
    verifyPhotographerOwnership(photographer, req.user);

    const updated = await updateGallery(req.params.id, images);
    return ApiResponse.success(res, "Gallery updated", updated);
  } catch (error) {
    next(error);
  }
};