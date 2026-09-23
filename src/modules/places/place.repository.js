// src/modules/places/place.repository.js
import { Op } from "sequelize";
import Place from "../../database/models/core/Place.js";

export const createPlace = async (payload) => {
  return await Place.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: getAllPlaces — filter isActive by default (public safety)
// Admin can pass includeInactive: true
// ═══════════════════════════════════════════════════════════════
export const getAllPlaces = async ({
  city,
  category,
  page = 1,
  limit = 10,
  includeInactive = false,
} = {}) => {
  const where = {};
  if (city) where.city = city;
  if (category) where.category = category;

  // ✅ FIX: Only active places visible unless explicitly requested
  if (!includeInactive) {
    where.isActive = true;
  }

  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);

  return await Place.findAndCountAll({
    where,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["createdAt", "DESC"]],
  });
};

export const getPlaceById = async (id) => {
  return await Place.findByPk(id);
};

export const getFeatured = async () => {
  return await Place.findAll({
    where: { isFeatured: true, isActive: true },
    limit: 5,
  });
};

export const searchPlaces = async (q, city) => {
  const where = {
    isActive: true, // ✅ FIX: only active
    [Op.or]: [
      { name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } },
      { category: { [Op.iLike]: `%${q}%` } },
    ],
  };
  if (city) where.city = city;
  return await Place.findAll({ where });
};

export const updatePlaceById = async (id, payload) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.update(payload);
  return place;
};

export const deletePlaceById = async (id) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.destroy();
  return true;
};

// ═══════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════
export const addGalleryImage = async (placeId, imageUrl) => {
  const place = await Place.findByPk(placeId);
  if (!place) return null;
  const gallery = Array.isArray(place.gallery) ? place.gallery : [];
  gallery.push(imageUrl);
  await place.update({ gallery });
  return place;
};

export const removeGalleryImage = async (placeId, imageUrl) => {
  const place = await Place.findByPk(placeId);
  if (!place) return null;
  const gallery = (Array.isArray(place.gallery) ? place.gallery : []).filter(
    (url) => url !== imageUrl
  );
  await place.update({ gallery });
  return place;
};

export const replaceGallery = async (placeId, images) => {
  const place = await Place.findByPk(placeId);
  if (!place) return null;
  await place.update({ gallery: images });
  return place;
};