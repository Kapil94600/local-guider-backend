// src/modules/idCards/idCard.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  getMyIdCard,
  fetchAllIdCards,
  revokeMyIdCard,
  fetchIdCardById,   // ✅ Added
} from "./idCard.service.js";

export const getMyIdCardController = async (req, res, next) => {
  try {
    const card = await getMyIdCard(req.user.id);
    return ApiResponse.success(res, "ID Card fetched successfully", card);
  } catch (error) { next(error); }
};

export const getIdCards = async (req, res, next) => {
  try {
    const cards = await fetchAllIdCards(req.query);
    return ApiResponse.success(res, "ID Cards fetched successfully", cards);
  } catch (error) { next(error); }
};

// ✅ Added
export const getIdCardById = async (req, res, next) => {
  try {
    const card = await fetchIdCardById(req.params.id);
    return ApiResponse.success(res, "ID Card fetched successfully", card);
  } catch (error) { next(error); }
};

export const revokeIdCard = async (req, res, next) => {
  try {
    const card = await revokeMyIdCard(req.params.id);
    return ApiResponse.success(res, "ID Card revoked successfully", card);
  } catch (error) { next(error); }
};