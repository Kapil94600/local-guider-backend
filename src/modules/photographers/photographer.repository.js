import { Op } from "sequelize";
import Photographer from "../../database/models/core/Photographer.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import Place from "../../database/models/core/Place.js";

export const createPhotographer = async (payload) => {
  return await Photographer.create(payload);
};

export const getAllPhotographers = async ({ city, placeId, userId, search, page = 1, limit = 10 }) => {
  const where = {};
  if (city) where.location = city;
  if (placeId) where.placeIds = { [Op.contains]: [placeId] };
  if (userId) where.userId = userId;
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { bio: { [Op.iLike]: `%${search}%` } },
      { location: { [Op.iLike]: `%${search}%` } },
    ];
  }
  return await Photographer.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [["createdAt", "DESC"]],
  });
};

export const getPhotographerById = async (id) => {
  return await Photographer.findByPk(id);
};

export const getPhotographerByUserId = async (userId) => {
  return await Photographer.findOne({ where: { userId } });
};

export const updatePhotographerById = async (id, payload) => {
  const photographer = await Photographer.findByPk(id);
  if (!photographer) return null;
  await photographer.update(payload);
  return photographer;
};

export const deletePhotographerById = async (id) => {
  const photographer = await Photographer.findByPk(id);
  if (!photographer) return null;
  await photographer.destroy();
  return true;
};

export const getPhotographerPlaces = async (photographerId) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (!photographer || !photographer.placeIds || photographer.placeIds.length === 0) return [];
  const places = await Place.findAll({ where: { id: { [Op.in]: photographer.placeIds } } });
  return places;
};

// Plans
export const getPlansByPhotographerId = async (photographerId) => {
  return await PhotographerPlan.findAll({ where: { photographerId }, order: [["createdAt", "DESC"]] });
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

// ✅ Gallery Functions
export const addGalleryImage = async (photographerId, imageUrl) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (!photographer) return null;
  const gallery = Array.isArray(photographer.gallery) ? photographer.gallery : [];
  gallery.push(imageUrl);
  await photographer.update({ gallery });
  return photographer;
};

export const removeGalleryImage = async (photographerId, imageUrl) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (!photographer) return null;
  const gallery = (Array.isArray(photographer.gallery) ? photographer.gallery : []).filter(url => url !== imageUrl);
  await photographer.update({ gallery });
  return photographer;
};

export const replaceGallery = async (photographerId, images) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (!photographer) return null;
  await photographer.update({ gallery: images });
  return photographer;
};