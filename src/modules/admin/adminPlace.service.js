import {
  getAllPlaces,
  getPlaceById,
  createPlace,          // ✅ Add
  updatePlaceById,      // ✅ Add
  updatePlaceStatus,
  deletePlaceById,
} from "./adminPlace.repository.js";

export const fetchPlaces = async () => {
  return await getAllPlaces();
};

export const fetchPlace = async (id) => {
  const place = await getPlaceById(id);
  if (!place) throw new Error("Place not found");
  return place;
};

// ✅ New: Create Place
export const addPlace = async (payload) => {
  return await createPlace(payload);
};

// ✅ New: Update Place
export const editPlace = async (id, payload) => {
  const place = await updatePlaceById(id, payload);
  if (!place) throw new Error("Place not found");
  return place;
};

export const changePlaceStatus = async (id, isActive) => {
  if (typeof isActive !== "boolean") {
    throw new Error("isActive must be true or false");
  }
  const place = await updatePlaceStatus(id, isActive);
  if (!place) throw new Error("Place not found");
  return place;
};

export const removePlace = async (id) => {
  const result = await deletePlaceById(id);
  if (!result) throw new Error("Place not found");
  return { message: "Place deleted successfully" };
};