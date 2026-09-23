// src/modules/photographers/photographer.repository.js
import { Op } from "sequelize";
import Photographer from "../../database/models/core/Photographer.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import Place from "../../database/models/core/Place.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createPhotographer = async (payload) => {
  return await Photographer.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-14: `Op.overlap` (was `Op.contains`) — consistency
// ✅ Pagination safety limits
// ═══════════════════════════════════════════════════════════════
export const getAllPhotographers = async ({
  city,
  placeId,
  userId,
  search,
  page = 1,
  limit = 10,
}) => {
  const where = {};

  if (city) where.location = city;

  // ✅ FIX B-14: Changed from Op.contains to Op.overlap
  // Matches if placeId exists anywhere in the array
  if (placeId) where.placeIds = { [Op.overlap]: [placeId] };

  if (userId) where.userId = userId;

  if (search) {
    const s = search.trim();
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${s}%` } },
      { bio: { [Op.iLike]: `%${s}%` } },
      { location: { [Op.iLike]: `%${s}%` } },
    ];
  }

  // ✅ Safety limits
  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);

  return await Photographer.findAndCountAll({
    where,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// FIND BY ID
// ═══════════════════════════════════════════════════════════════
export const getPhotographerById = async (id) => {
  return await Photographer.findByPk(id);
};

export const getPhotographerByUserId = async (userId) => {
  return await Photographer.findOne({ where: { userId } });
};

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
export const updatePhotographerById = async (id, payload) => {
  const photographer = await Photographer.findByPk(id);
  if (!photographer) return null;
  await photographer.update(payload);
  return photographer;
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const deletePhotographerById = async (id) => {
  const photographer = await Photographer.findByPk(id);
  if (!photographer) return null;
  await photographer.destroy();
  return true;
};

// ═══════════════════════════════════════════════════════════════
// PLACES
// ═══════════════════════════════════════════════════════════════
export const getPhotographerPlaces = async (photographerId) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (
    !photographer ||
    !photographer.placeIds ||
    photographer.placeIds.length === 0
  )
    return [];
  const places = await Place.findAll({
    where: { id: { [Op.in]: photographer.placeIds } },
  });
  return places;
};

// ═══════════════════════════════════════════════════════════════
// PLANS
// ═══════════════════════════════════════════════════════════════
export const getPlansByPhotographerId = async (photographerId) => {
  return await PhotographerPlan.findAll({
    where: { photographerId },
    order: [["createdAt", "DESC"]],
  });
};

export const getPhotographerPlanById = async (planId) => {
  return await PhotographerPlan.findByPk(planId);
};

export const createPhotographerPlan = async (payload) => {
  return await PhotographerPlan.create(payload);
};

export const updatePhotographerPlan = async (planId, payload) => {
  const plan = await PhotographerPlan.findByPk(planId);
  if (!plan) return null;
  await plan.update(payload);
  return plan;
};

export const deletePhotographerPlan = async (planId) => {
  const plan = await PhotographerPlan.findByPk(planId);
  if (!plan) return null;
  await plan.destroy();
  return true;
};

// ═══════════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════════
export const addGalleryImage = async (photographerId, imageUrl) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (!photographer) return null;
  const gallery = Array.isArray(photographer.gallery)
    ? photographer.gallery
    : [];
  gallery.push(imageUrl);
  await photographer.update({ gallery });
  return photographer;
};

export const removeGalleryImage = async (photographerId, imageUrl) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (!photographer) return null;
  const gallery = (
    Array.isArray(photographer.gallery) ? photographer.gallery : []
  ).filter((url) => url !== imageUrl);
  await photographer.update({ gallery });
  return photographer;
};

export const replaceGallery = async (photographerId, images) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (!photographer) return null;
  await photographer.update({ gallery: images });
  return photographer;
};