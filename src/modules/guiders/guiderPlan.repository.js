import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import { Op } from "sequelize";

export const createGuiderPlan = async (payload) => {
  return await GuiderPlan.create(payload);
};

export const getAllGuiderPlans = async (guiderId, placeId) => {
  const where = {};
  if (guiderId) where.guiderId = guiderId;
  if (placeId) {
    where.placeIds = { [Op.overlap]: [placeId] };
  }
  return await GuiderPlan.findAll({
    where,
    order: [["createdAt", "DESC"]],
  });
};

export const getGuiderPlanById = async (id) => {
  return await GuiderPlan.findByPk(id);
};

export const updateGuiderPlanById = async (id, payload) => {
  const plan = await GuiderPlan.findByPk(id);
  if (!plan) return null;
  await plan.update(payload);
  return plan;
};

export const deleteGuiderPlanById = async (id) => {
  const plan = await GuiderPlan.findByPk(id);
  if (!plan) return null;
  await plan.destroy();
  return true;
};