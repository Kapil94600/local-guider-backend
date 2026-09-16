import { ApiResponse } from "../../utils/apiResponse.js";
import {
  fetchActiveOffers,
  fetchAllOffers,
  fetchOffer,
  addOffer,
  editOffer,
  removeOffer,
} from "./offer.service.js";

// Public – App open hote hi call karo
export const getActiveOffers = async (req, res, next) => {
  try {
    const offers = await fetchActiveOffers();
    return ApiResponse.success(res, "Active offers fetched", offers);
  } catch (error) {
    next(error);
  }
};

// Admin
export const getAllOffers = async (req, res, next) => {
  try {
    const offers = await fetchAllOffers();
    return ApiResponse.success(res, "All offers fetched", offers);
  } catch (error) {
    next(error);
  }
};

export const getOffer = async (req, res, next) => {
  try {
    const offer = await fetchOffer(req.params.id);
    return ApiResponse.success(res, "Offer fetched", offer);
  } catch (error) {
    next(error);
  }
};

export const createOffer = async (req, res, next) => {
  try {
    const offer = await addOffer(req.body);
    return ApiResponse.success(res, "Offer created", offer, 201);
  } catch (error) {
    next(error);
  }
};

export const updateOffer = async (req, res, next) => {
  try {
    const offer = await editOffer(req.params.id, req.body);
    return ApiResponse.success(res, "Offer updated", offer);
  } catch (error) {
    next(error);
  }
};

export const deleteOffer = async (req, res, next) => {
  try {
    const result = await removeOffer(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};