// src/modules/places/place.service.js
import {
  createPlace,
  getAllPlaces,
  getNearbyPlaces,   // ✅ NEW
  getPlaceById,
  getFeatured,
  searchPlaces,
  updatePlaceById,
  deletePlaceById,
  addGalleryImage,
  removeGalleryImage,
  replaceGallery,
} from "./place.repository.js";

export const addPlace = async (payload) => {
  return await createPlace(payload);
};

export const fetchPlaces = async ({ city, category, page, limit }) => {
  return await getAllPlaces({ city, category, page, limit });
};

// ✅ NEW: Fetch nearby places with location-based sorting
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

export const fetchFeaturedPlaces = async () => {
  return await getFeatured();
};

export const searchPlacesService = async (q, city) => {
  return await searchPlaces(q, city);
};

export const fetchPlaceById = async (id) => {
  const place = await getPlaceById(id);
  if (!place) throw new Error("Place not found");
  return place;
};

export const updatePlace = async (id, payload) => {
  const place = await updatePlaceById(id, payload);
  if (!place) throw new Error("Place not found");
  return place;
};

export const removePlace = async (id) => {
  const result = await deletePlaceById(id);
  if (!result) throw new Error("Place not found");
  return { message: "Place deleted successfully" };
};

// ═══════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════
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