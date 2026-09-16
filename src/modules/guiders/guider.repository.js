import { Op } from "sequelize";
import Guider from "../../database/models/core/Guider.js";
import Review from "../../database/models/core/Review.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import Place from "../../database/models/core/Place.js";

export const createGuider = async (payload) => {
  return await Guider.create(payload);
};

export const getAllGuiders = async ({ city, placeId, userId, search, page = 1, limit = 10 }) => {
  const where = {};
  if (city) where.location = city;
  if (placeId) where.placeIds = { [Op.overlap]: [placeId] };
  if (userId) where.userId = userId;
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { bio: { [Op.iLike]: `%${search}%` } },
      { location: { [Op.iLike]: `%${search}%` } },
    ];
  }
  return await Guider.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [["createdAt", "DESC"]],
  });
};

export const getGuiderById = async (id) => {
  return await Guider.findByPk(id);
};

export const getGuiderByUserId = async (userId) => {
  return await Guider.findOne({ where: { userId } });
};

export const getTopRatedGuiders = async () => {
  return await Guider.findAll({ order: [["experience", "DESC"]], limit: 5 });
};

export const getGuiderReviewsById = async (guiderId) => {
  return await Review.findAll({ where: { guiderId } });
};

export const updateGuiderById = async (id, payload) => {
  const guider = await Guider.findByPk(id);
  if (!guider) return null;
  await guider.update(payload);
  return guider;
};

export const deleteGuiderById = async (id) => {
  const guider = await Guider.findByPk(id);
  if (!guider) return null;
  await guider.destroy();
  return true;
};

export const getGuiderPlaces = async (guiderId) => {
  const guider = await Guider.findByPk(guiderId);
  if (!guider || !guider.placeIds || guider.placeIds.length === 0) return [];
  const places = await Place.findAll({ where: { id: { [Op.in]: guider.placeIds } } });
  return places;
};

// Plans
export const getPlansByGuiderId = async (guiderId) => {
  return await GuiderPlan.findAll({ where: { guiderId }, order: [["createdAt", "DESC"]] });
};

export const getPlanById = async (planId) => {
  return await GuiderPlan.findByPk(planId);
};

export const createGuiderPlan = async (payload) => {
  return await GuiderPlan.create(payload);
};

export const updateGuiderPlan = async (planId, payload) => {
  const plan = await GuiderPlan.findByPk(planId);
  if (!plan) return null;
  await plan.update(payload);
  return plan;
};

export const deleteGuiderPlan = async (planId) => {
  const plan = await GuiderPlan.findByPk(planId);
  if (!plan) return null;
  await plan.destroy();
  return true;
};

// ✅ Gallery Functions
export const addGalleryImage = async (guiderId, imageUrl) => {
  const guider = await Guider.findByPk(guiderId);
  if (!guider) return null;
  const gallery = Array.isArray(guider.gallery) ? guider.gallery : [];
  gallery.push(imageUrl);
  await guider.update({ gallery });
  return guider;
};

export const removeGalleryImage = async (guiderId, imageUrl) => {
  const guider = await Guider.findByPk(guiderId);
  if (!guider) return null;
  const gallery = (Array.isArray(guider.gallery) ? guider.gallery : []).filter(url => url !== imageUrl);
  await guider.update({ gallery });
  return guider;
};

export const replaceGallery = async (guiderId, images) => {
  const guider = await Guider.findByPk(guiderId);
  if (!guider) return null;
  await guider.update({ gallery: images });
  return guider;
};