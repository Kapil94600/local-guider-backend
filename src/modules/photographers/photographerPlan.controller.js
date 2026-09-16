import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addPhotographerPlan,
  fetchPhotographerPlans,
  fetchPhotographerPlanById,
  updatePhotographerPlan,
  removePhotographerPlan,
} from "./photographerPlan.service.js";

export const createPhotographerPlan = async (req, res, next) => {
  try {
    const plan = await addPhotographerPlan(req.body);
    return ApiResponse.success(res, "Photographer plan created successfully", plan, 201);
  } catch (error) {
    next(error);
  }
};

export const getPhotographerPlans = async (req, res, next) => {
  try {
    const { photographerId, placeId } = req.query;
    const plans = await fetchPhotographerPlans(photographerId, placeId);
    return ApiResponse.success(res, "Photographer plans fetched successfully", plans);
  } catch (error) {
    next(error);
  }
};

export const getPhotographerPlan = async (req, res, next) => {
  try {
    const plan = await fetchPhotographerPlanById(req.params.id);
    return ApiResponse.success(res, "Photographer plan fetched successfully", plan);
  } catch (error) {
    next(error);
  }
};

export const editPhotographerPlan = async (req, res, next) => {
  try {
    const plan = await updatePhotographerPlan(req.params.id, req.body);
    return ApiResponse.success(res, "Photographer plan updated successfully", plan);
  } catch (error) {
    next(error);
  }
};

export const deletePhotographerPlan = async (req, res, next) => {
  try {
    const result = await removePhotographerPlan(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};