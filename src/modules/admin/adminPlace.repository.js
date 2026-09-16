import Place from "../../database/models/core/Place.js";

export const getAllPlaces = async () => {
  return await Place.findAll({ order: [["createdAt", "DESC"]] });
};

export const getPlaceById = async (id) => {
  return await Place.findByPk(id);
};

// ✅ Fix: Empty strings ko null me convert karo
const sanitizePlaceData = (data) => {
  return {
    ...data,
    latitude: data.latitude === '' || data.latitude === undefined ? null : Number(data.latitude),
    longitude: data.longitude === '' || data.longitude === undefined ? null : Number(data.longitude),
    rating: data.rating === '' || data.rating === undefined ? 0 : Number(data.rating),
    totalReviews: data.totalReviews === '' || data.totalReviews === undefined ? 0 : Number(data.totalReviews),
  };
};

export const createPlace = async (payload) => {
  const clean = sanitizePlaceData(payload);
  return await Place.create(clean);
};

export const updatePlaceById = async (id, payload) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  const clean = sanitizePlaceData(payload);
  await place.update(clean);
  return place;
};

export const updatePlaceStatus = async (id, isActive) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.update({ isActive });
  return place;
};

export const deletePlaceById = async (id) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.destroy();
  return true;
};