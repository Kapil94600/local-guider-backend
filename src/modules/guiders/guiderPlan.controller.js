// src/modules/guiders/guiderPlan.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addGuiderPlan,
  fetchGuiderPlans,
  fetchGuiderPlanById,
  updateGuiderPlan,
  removeGuiderPlan,
} from "./guiderPlan.service.js";
import Guider from "../../database/models/core/Guider.js";

// ✅ HELPER: Verify ownership via guiderId
const verifyGuiderOwnershipById = async (guiderId, user) => {
  const guider = await Guider.findByPk(guiderId);
  if (!guider) throw new Error("Guider not found");
  if (user.role === "ADMIN") return true;
  if (guider.userId === user.id) return true;
  throw new Error("You can only manage your own plans");
};

export const createGuiderPlan = async (req, res, next) => {
  try {
    const { guiderId } = req.body;
    if (!guiderId) throw new Error("guiderId is required in body");

    await verifyGuiderOwnershipById(guiderId, req.user);

    const plan = await addGuiderPlan(req.body);
    return ApiResponse.success(res, "Plan created", plan, 201);
  } catch (error) {
    next(error);
  }
};

export const getGuiderPlans = async (req, res, next) => {
  try {
    const { guiderId, placeId } = req.query;
    const plans = await fetchGuiderPlans(guiderId, placeId);
    return ApiResponse.success(res, "Plans fetched", plans);
  } catch (error) {
    next(error);
  }
};

export const getGuiderPlan = async (req, res, next) => {
  try {
    const plan = await fetchGuiderPlanById(req.params.id);
    return ApiResponse.success(res, "Plan fetched", plan);
  } catch (error) {
    next(error);
  }
};

// ✅ Ownership enforced
export const editGuiderPlan = async (req, res, next) => {
  try {
    const existing = await fetchGuiderPlanById(req.params.id);
    await verifyGuiderOwnershipById(existing.guiderId, req.user);

    const plan = await updateGuiderPlan(req.params.id, req.body);
    return ApiResponse.success(res, "Plan updated", plan);
  } catch (error) {
    next(error);
  }
};

// ✅ Ownership enforced
export const deleteGuiderPlan = async (req, res, next) => {
  try {
    const existing = await fetchGuiderPlanById(req.params.id);
    await verifyGuiderOwnershipById(existing.guiderId, req.user);

    const result = await removeGuiderPlan(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};