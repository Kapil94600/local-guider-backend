// src/modules/guiders/guider.service.js
// ═══════════════════════════════════════════════════════════════
// GUIDER SERVICE — with 404 ApiError
// ═══════════════════════════════════════════════════════════════
import { ApiError } from "../../utils/apiError.js";
import {
  createGuider,
  getAllGuiders,
  getGuiderById,
  getGuiderByUserId,
  getTopRatedGuiders,
  getGuiderReviewsById,
  updateGuiderById,
  deleteGuiderById,
  getPlansByGuiderId,
  getPlanById,
  createGuiderPlan,
  updateGuiderPlan,
  deleteGuiderPlan,
  getGuiderPlaces,
  addGalleryImage,
  removeGalleryImage,
  replaceGallery,
} from "./guider.repository.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const addGuider = async (payload) => {
  return await createGuider(payload);
};

// ═══════════════════════════════════════════════════════════════
// FETCH LIST
// ═══════════════════════════════════════════════════════════════
export const fetchGuiders = async (params = {}) => {
  return await getAllGuiders(params);
};

// ═══════════════════════════════════════════════════════════════
// ✅ FETCH BY ID — 404
// ═══════════════════════════════════════════════════════════════
export const fetchGuiderById = async (id) => {
  const guider = await getGuiderById(id);
  if (!guider) throw new ApiError(404, "Guider not found");
  return guider;
};

// ═══════════════════════════════════════════════════════════════
// FETCH BY USER ID
// ═══════════════════════════════════════════════════════════════
export const fetchGuiderByUserId = async (userId) => {
  return await getGuiderByUserId(userId);
};

// ═══════════════════════════════════════════════════════════════
// TOP RATED
// ═══════════════════════════════════════════════════════════════
export const fetchTopGuiders = async () => {
  return await getTopRatedGuiders();
};

// ═══════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════
export const fetchGuiderReviews = async (guiderId) => {
  return await getGuiderReviewsById(guiderId);
};

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
export const updateGuider = async (id, payload) => {
  const guider = await updateGuiderById(id, payload);
  if (!guider) throw new ApiError(404, "Guider not found");
  return guider;
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const removeGuider = async (id) => {
  const result = await deleteGuiderById(id);
  if (!result) throw new ApiError(404, "Guider not found");
  return { message: "Guider deleted successfully" };
};

// ═══════════════════════════════════════════════════════════════
// PLACES
// ═══════════════════════════════════════════════════════════════
export const fetchGuiderPlaces = async (guiderId) => {
  return await getGuiderPlaces(guiderId);
};

// ═══════════════════════════════════════════════════════════════
// PLANS
// ═══════════════════════════════════════════════════════════════
export const fetchGuiderPlans = async (guiderId) => {
  return await getPlansByGuiderId(guiderId);
};

export const fetchPlanById = async (planId) => {
  const plan = await getPlanById(planId);
  if (!plan) throw new ApiError(404, "Plan not found");
  return plan;
};

export const addGuiderPlan = async (guiderId, payload) => {
  return await createGuiderPlan({ ...payload, guiderId });
};

export const editGuiderPlan = async (planId, payload) => {
  const plan = await updateGuiderPlan(planId, payload);
  if (!plan) throw new ApiError(404, "Plan not found");
  return plan;
};

export const removeGuiderPlan = async (planId) => {
  const result = await deleteGuiderPlan(planId);
  if (!result) throw new ApiError(404, "Plan not found");
  return { message: "Plan deleted successfully" };
};

// ═══════════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════════
export const addGallery = async (guiderId, imageUrl) => {
  const guider = await addGalleryImage(guiderId, imageUrl);
  if (!guider) throw new ApiError(404, "Guider not found");
  return guider;
};

export const removeGallery = async (guiderId, imageUrl) => {
  const guider = await removeGalleryImage(guiderId, imageUrl);
  if (!guider) throw new ApiError(404, "Guider not found");
  return guider;
};

export const updateGallery = async (guiderId, images) => {
  const guider = await replaceGallery(guiderId, images);
  if (!guider) throw new ApiError(404, "Guider not found");
  return guider;
};