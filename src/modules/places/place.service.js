// src/modules/places/place.service.js
// ═══════════════════════════════════════════════════════════════
// PLACE SERVICE — with nearby places
// ═══════════════════════════════════════════════════════════════
import {
  createPlace,
  getAllPlaces,
  getNearbyPlaces,
  getPlaceById,
  getFeatured,
  searchPlaces,
  updatePlaceById,
  deletePlaceById,
  addGalleryImage,
  removeGalleryImage,
  replaceGallery,
} from "./place.repository.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const addPlace = async (payload) => {
  return await createPlace(payload);
};

// ═══════════════════════════════════════════════════════════════
// GET ALL (basic filter)
// ═══════════════════════════════════════════════════════════════
export const fetchPlaces = async ({ city, category, page, limit }) => {
  return await getAllPlaces({ city, category, page, limit });
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: GET NEARBY PLACES (tier-based sorting)
// ═══════════════════════════════════════════════════════════════
export const fetchNearbyPlaces = async ({
  lat,
  lng,
  city,
  district,
  state,
  radius,
  limit,
}) => {
  return await getNearbyPlaces({
    lat,
    lng,
    city,
    district,
    state,
    radius,
    limit,
  });
};

// ═══════════════════════════════════════════════════════════════
// GET FEATURED
// ═══════════════════════════════════════════════════════════════
export const fetchFeaturedPlaces = async () => {
  return await getFeatured();
};

// ═══════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════
export const searchPlacesService = async (q, city) => {
  return await searchPlaces(q, city);
};

// ═══════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════
export const fetchPlaceById = async (id) => {
  const place = await getPlaceById(id);
  if (!place) throw new Error("Place not found");
  return place;
};

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
export const updatePlace = async (id, payload) => {
  const place = await updatePlaceById(id, payload);
  if (!place) throw new Error("Place not found");
  return place;
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const removePlace = async (id) => {
  const result = await deletePlaceById(id);
  if (!result) throw new Error("Place not found");
  return { message: "Place deleted successfully" };
};

// ═══════════════════════════════════════════════════════════════
// GALLERY SERVICE
// ═══════════════════════════════════════════════════════════════
export const addGallery = async (placeId, imageUrl) => {
  const place = await addGalleryImage(placeId, imageUrl);
  if (!place) throw new Error("Place not found");
  return place;
};

export const removeGallery = async (placeId, imageUrl) => {
  const place = await removeGalleryImage(placeId, imageUrl);
  if (!place) throw new Error("Place not found");
  return place;
};

export const updateGallery = async (placeId, images) => {
  const place = await replaceGallery(placeId, images);
  if (!place) throw new Error("Place not found");
  return place;
};