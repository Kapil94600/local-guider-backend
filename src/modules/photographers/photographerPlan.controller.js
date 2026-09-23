// src/modules/photographers/photographerPlan.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addPhotographerPlan,
  fetchPhotographerPlans,
  fetchPhotographerPlanById,
  updatePhotographerPlan,
  removePhotographerPlan,
} from "./photographerPlan.service.js";
import Photographer from "../../database/models/core/Photographer.js";

// ═══════════════════════════════════════════════════════════════
// ✅ HELPER: Verify ownership via photographerId
// ═══════════════════════════════════════════════════════════════
const verifyPhotographerOwnershipById = async (photographerId, user) => {
  const photographer = await Photographer.findByPk(photographerId);
  if (!photographer) throw new Error("Photographer not found");
  if (user.role === "ADMIN") return true;
  if (photographer.userId === user.id) return true;
  throw new Error("You can only manage your own plans");
};

// ═══════════════════════════════════════════════════════════════
// ✅ CREATE PLAN — ownership enforced
// ═══════════════════════════════════════════════════════════════
export const createPhotographerPlan = async (req, res, next) => {
  try {
    const { photographerId } = req.body;
    if (!photographerId) throw new Error("photographerId is required in body");

    await verifyPhotographerOwnershipById(photographerId, req.user);

    const plan = await addPhotographerPlan(req.body);
    return ApiResponse.success(
      res,
      "Photographer plan created successfully",
      plan,
      201
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ GET PLANS — public
// ═══════════════════════════════════════════════════════════════
export const getPhotographerPlans = async (req, res, next) => {
  try {
    const { photographerId, placeId } = req.query;
    const plans = await fetchPhotographerPlans(photographerId, placeId);
    return ApiResponse.success(
      res,
      "Photographer plans fetched successfully",
      plans
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ GET SINGLE PLAN — public
// ═══════════════════════════════════════════════════════════════
export const getPhotographerPlan = async (req, res, next) => {
  try {
    const plan = await fetchPhotographerPlanById(req.params.id);
    return ApiResponse.success(
      res,
      "Photographer plan fetched successfully",
      plan
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ UPDATE PLAN — ownership enforced
// ═══════════════════════════════════════════════════════════════
export const editPhotographerPlan = async (req, res, next) => {
  try {
    const existing = await fetchPhotographerPlanById(req.params.id);
    await verifyPhotographerOwnershipById(existing.photographerId, req.user);

    const plan = await updatePhotographerPlan(req.params.id, req.body);
    return ApiResponse.success(
      res,
      "Photographer plan updated successfully",
      plan
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ DELETE PLAN — ownership enforced
// ═══════════════════════════════════════════════════════════════
export const deletePhotographerPlan = async (req, res, next) => {
  try {
    const existing = await fetchPhotographerPlanById(req.params.id);
    await verifyPhotographerOwnershipById(existing.photographerId, req.user);

    const result = await removePhotographerPlan(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};