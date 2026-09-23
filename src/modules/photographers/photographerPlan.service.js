import {
  createPhotographerPlan,
  getAllPhotographerPlans,
  getPhotographerPlanById,
  updatePhotographerPlanById,
  deletePhotographerPlanById,
} from "./photographerPlan.repository.js";

export const addPhotographerPlan = async (payload) => {
  // ✅ validate 1-3 places
  if (!payload.placeIds || !Array.isArray(payload.placeIds) || payload.placeIds.length < 1 || payload.placeIds.length > 3) {
    throw new Error("Select at least 1 and at most 3 places");
  }
  return await createPhotographerPlan(payload);
};

export const fetchPhotographerPlans = async (photographerId, placeId) => {
  return await getAllPhotographerPlans(photographerId, placeId);
};

export const fetchPhotographerPlanById = async (id) => {
  const plan = await getPhotographerPlanById(id);
  if (!plan) throw new Error("Plan not found");
  return plan;
};

export const updatePhotographerPlan = async (id, payload) => {
  // ✅ validate if placeIds provided
  if (payload.placeIds && (!Array.isArray(payload.placeIds) || payload.placeIds.length < 1 || payload.placeIds.length > 3)) {
    throw new Error("Select at least 1 and at most 3 places");
  }
  const plan = await updatePhotographerPlanById(id, payload);
  if (!plan) throw new Error("Plan not found");
  return plan;
};

export const removePhotographerPlan = async (id) => {
  const result = await deletePhotographerPlanById(id);
  if (!result) throw new Error("Plan not found");
  return { message: "Plan deleted successfully" };
};