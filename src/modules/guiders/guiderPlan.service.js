import {
  createGuiderPlan,
  getAllGuiderPlans,
  getGuiderPlanById,
  updateGuiderPlanById,
  deleteGuiderPlanById,
} from "./guiderPlan.repository.js";

export const addGuiderPlan = async (payload) => {
  // ✅ validate 1-3 places
  if (!payload.placeIds || !Array.isArray(payload.placeIds) || payload.placeIds.length < 1 || payload.placeIds.length > 3) {
    throw new Error("Select at least 1 and at most 3 places");
  }
  return await createGuiderPlan(payload);
};

export const fetchGuiderPlans = async (guiderId, placeId) => {
  return await getAllGuiderPlans(guiderId, placeId);
};

export const fetchGuiderPlanById = async (id) => {
  const plan = await getGuiderPlanById(id);
  if (!plan) throw new Error("Plan not found");
  return plan;
};

export const updateGuiderPlan = async (id, payload) => {
  // ✅ validate if placeIds provided
  if (payload.placeIds && (!Array.isArray(payload.placeIds) || payload.placeIds.length < 1 || payload.placeIds.length > 3)) {
    throw new Error("Select at least 1 and at most 3 places");
  }
  const plan = await updateGuiderPlanById(id, payload);
  if (!plan) throw new Error("Plan not found");
  return plan;
};

export const removeGuiderPlan = async (id) => {
  const result = await deleteGuiderPlanById(id);
  if (!result) throw new Error("Plan not found");
  return { message: "Plan deleted successfully" };
};