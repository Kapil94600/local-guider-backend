import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addGuiderPlan,
  fetchGuiderPlans,
  fetchGuiderPlanById,
  updateGuiderPlan,
  removeGuiderPlan,
} from "./guiderPlan.service.js";

export const createGuiderPlan = async (req, res, next) => {
  try {
    const plan = await addGuiderPlan(req.body);
    return ApiResponse.success(res, "Plan created", plan, 201);
  } catch (error) { next(error); }
};

export const getGuiderPlans = async (req, res, next) => {
  try {
    const { guiderId, placeId } = req.query;
    const plans = await fetchGuiderPlans(guiderId, placeId);
    return ApiResponse.success(res, "Plans fetched", plans);
  } catch (error) { next(error); }
};

export const getGuiderPlan = async (req, res, next) => {
  try {
    const plan = await fetchGuiderPlanById(req.params.id);
    return ApiResponse.success(res, "Plan fetched", plan);
  } catch (error) { next(error); }
};

export const editGuiderPlan = async (req, res, next) => {
  try {
    const plan = await updateGuiderPlan(req.params.id, req.body);
    return ApiResponse.success(res, "Plan updated", plan);
  } catch (error) { next(error); }
};

export const deleteGuiderPlan = async (req, res, next) => {
  try {
    const result = await removeGuiderPlan(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};