import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addGuider,
  fetchGuiders,
  fetchGuiderById,
  fetchTopGuiders,
  fetchGuiderReviews,
  updateGuider,
  removeGuider,
  fetchGuiderPlans,
  fetchPlanById,
  addGuiderPlan,
  editGuiderPlan,
  removeGuiderPlan,
  fetchGuiderPlaces,
  // ✅ Gallery
  addGallery,
  removeGallery,
  updateGallery,
} from "./guider.service.js";

export const createGuider = async (req, res, next) => {
  try { const guider = await addGuider(req.body); return ApiResponse.success(res, "Guider created successfully", guider, 201); }
  catch (error) { next(error); }
};

export const getGuiders = async (req, res, next) => {
  try { const guiders = await fetchGuiders(req.query); return ApiResponse.success(res, "Guiders fetched successfully", guiders); }
  catch (error) { next(error); }
};

export const getTopGuiders = async (req, res, next) => {
  try { const guiders = await fetchTopGuiders(); return ApiResponse.success(res, "Top guiders fetched", guiders); }
  catch (error) { next(error); }
};

export const getGuider = async (req, res, next) => {
  try { const guider = await fetchGuiderById(req.params.id); return ApiResponse.success(res, "Guider fetched successfully", guider); }
  catch (error) { next(error); }
};

export const getGuiderReviews = async (req, res, next) => {
  try { const reviews = await fetchGuiderReviews(req.params.id); return ApiResponse.success(res, "Guider reviews fetched", reviews); }
  catch (error) { next(error); }
};

export const getGuiderPlaces = async (req, res, next) => {
  try { const places = await fetchGuiderPlaces(req.params.id); return ApiResponse.success(res, "Guider places fetched", places); }
  catch (error) { next(error); }
};

export const editGuider = async (req, res, next) => {
  try {
    const guiderId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const guider = await fetchGuiderById(guiderId);
    if (!guider) throw new Error("Guider not found");
    if (userRole !== "ADMIN" && guider.userId !== userId) return res.status(403).json({ message: "You can only update your own profile" });
    const updatedGuider = await updateGuider(guiderId, req.body);
    return ApiResponse.success(res, "Guider updated successfully", updatedGuider);
  } catch (error) { next(error); }
};

export const deleteGuider = async (req, res, next) => {
  try { const result = await removeGuider(req.params.id); return ApiResponse.success(res, result.message, null); }
  catch (error) { next(error); }
};

export const getGuiderPlans = async (req, res, next) => {
  try { const plans = await fetchGuiderPlans(req.params.id); return ApiResponse.success(res, "Plans fetched successfully", plans); }
  catch (error) { next(error); }
};

export const getPlan = async (req, res, next) => {
  try { const plan = await fetchPlanById(req.params.planId); return ApiResponse.success(res, "Plan fetched successfully", plan); }
  catch (error) { next(error); }
};

export const createGuiderPlan = async (req, res, next) => {
  try { const plan = await addGuiderPlan(req.params.id, req.body); return ApiResponse.success(res, "Plan created successfully", plan, 201); }
  catch (error) { next(error); }
};

export const updateGuiderPlan = async (req, res, next) => {
  try { const plan = await editGuiderPlan(req.params.planId, req.body); return ApiResponse.success(res, "Plan updated successfully", plan); }
  catch (error) { next(error); }
};

export const deleteGuiderPlan = async (req, res, next) => {
  try { const result = await removeGuiderPlan(req.params.planId); return ApiResponse.success(res, result.message, null); }
  catch (error) { next(error); }
};

// ✅ Gallery Controllers
export const addGuiderGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false, message: "imageUrl is required" });
    const guider = await addGallery(req.params.id, imageUrl);
    return ApiResponse.success(res, "Image added to gallery", guider);
  } catch (error) { next(error); }
};

export const removeGuiderGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    const guider = await removeGallery(req.params.id, imageUrl);
    return ApiResponse.success(res, "Image removed from gallery", guider);
  } catch (error) { next(error); }
};

export const replaceGuiderGallery = async (req, res, next) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images)) return res.status(400).json({ success: false, message: "images must be an array" });
    const guider = await updateGallery(req.params.id, images);
    return ApiResponse.success(res, "Gallery updated", guider);
  } catch (error) { next(error); }
};