import { ApiResponse } from "../../utils/apiResponse.js";
import {
  fetchSliders,
  fetchActiveSliders,
  fetchSlider,
  addSlider,
  editSlider,
  removeSlider,
} from "./slider.service.js";

export const getAllSliders = async (req, res, next) => {
  try {
    const sliders = await fetchSliders();
    return ApiResponse.success(res, "Sliders fetched successfully", sliders);
  } catch (error) { next(error); }
};

export const getActiveSliders = async (req, res, next) => {
  try {
    const sliders = await fetchActiveSliders();
    return ApiResponse.success(res, "Active sliders fetched successfully", sliders);
  } catch (error) { next(error); }
};

export const getSlider = async (req, res, next) => {
  try {
    const slider = await fetchSlider(req.params.id);
    return ApiResponse.success(res, "Slider fetched successfully", slider);
  } catch (error) { next(error); }
};

export const createSlider = async (req, res, next) => {
  try {
    const slider = await addSlider(req.body);
    return ApiResponse.success(res, "Slider created successfully", slider, 201);
  } catch (error) { next(error); }
};

export const updateSlider = async (req, res, next) => {
  try {
    const slider = await editSlider(req.params.id, req.body);
    return ApiResponse.success(res, "Slider updated successfully", slider);
  } catch (error) { next(error); }
};

export const deleteSlider = async (req, res, next) => {
  try {
    const result = await removeSlider(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};