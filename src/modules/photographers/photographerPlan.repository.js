import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import { Op } from "sequelize";

export const createPhotographerPlan = async (payload) => {
  return await PhotographerPlan.create(payload);
};

export const getAllPhotographerPlans = async (photographerId, placeId) => {
  const where = {};
  if (photographerId) where.photographerId = photographerId;
  if (placeId) {
    where.placeIds = { [Op.overlap]: [placeId] };
  }
  return await PhotographerPlan.findAll({
    where,
    order: [["createdAt", "DESC"]],
  });
};

export const getPhotographerPlanById = async (id) => {
  return await PhotographerPlan.findByPk(id);
};

export const updatePhotographerPlanById = async (id, payload) => {
  const plan = await PhotographerPlan.findByPk(id);
  if (!plan) return null;
  await plan.update(payload);
  return plan;
};

export const deletePhotographerPlanById = async (id) => {
  const plan = await PhotographerPlan.findByPk(id);
  if (!plan) return null;
  await plan.destroy();
  return true;
};