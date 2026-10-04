// src/modules/photographers/photographer.service.js
// ═══════════════════════════════════════════════════════════════
// PHOTOGRAPHER SERVICE — with 404 ApiError
// ═══════════════════════════════════════════════════════════════
import { ApiError } from "../../utils/apiError.js";
import {
  createPhotographer,
  getAllPhotographers,
  getPhotographerById,
  getPhotographerByUserId,
  updatePhotographerById,
  deletePhotographerById,
  getPhotographerPlaces,
  addGalleryImage,
  removeGalleryImage,
  replaceGallery,
} from "./photographer.repository.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const addPhotographer = async (payload) => {
  return await createPhotographer(payload);
};

// ═══════════════════════════════════════════════════════════════
// FETCH LIST
// ═══════════════════════════════════════════════════════════════
export const fetchPhotographers = async (params = {}) => {
  return await getAllPhotographers(params);
};

// ═══════════════════════════════════════════════════════════════
// ✅ FETCH BY ID — 404
// ═══════════════════════════════════════════════════════════════
export const fetchPhotographerById = async (id) => {
  const photographer = await getPhotographerById(id);
  if (!photographer) throw new ApiError(404, "Photographer not found");
  return photographer;
};

// ═══════════════════════════════════════════════════════════════
// FETCH BY USER ID
// ═══════════════════════════════════════════════════════════════
export const fetchPhotographerByUserId = async (userId) => {
  return await getPhotographerByUserId(userId);
};

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
export const updatePhotographer = async (id, payload) => {
  const photographer = await updatePhotographerById(id, payload);
  if (!photographer) throw new ApiError(404, "Photographer not found");
  return photographer;
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const removePhotographer = async (id) => {
  const result = await deletePhotographerById(id);
  if (!result) throw new ApiError(404, "Photographer not found");
  return { message: "Photographer deleted successfully" };
};

// ═══════════════════════════════════════════════════════════════
// PLACES
// ═══════════════════════════════════════════════════════════════
export const fetchPhotographerPlaces = async (photographerId) => {
  return await getPhotographerPlaces(photographerId);
};

// ═══════════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════════
export const addGallery = async (photographerId, imageUrl) => {
  const photographer = await addGalleryImage(photographerId, imageUrl);
  if (!photographer) throw new ApiError(404, "Photographer not found");
  return photographer;
};

export const removeGallery = async (photographerId, imageUrl) => {
  const photographer = await removeGalleryImage(photographerId, imageUrl);
  if (!photographer) throw new ApiError(404, "Photographer not found");
  return photographer;
};

export const updateGallery = async (photographerId, images) => {
  const photographer = await replaceGallery(photographerId, images);
  if (!photographer) throw new ApiError(404, "Photographer not found");
  return photographer;
};