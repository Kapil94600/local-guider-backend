// src/modules/analytics/analytics.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  fetchBookingTrend,
  fetchRevenueTrend,
  fetchUserGrowth,
  fetchTopGuiders,
  fetchTopPhotographers,
  fetchBookingStatus,
} from "./analytics.service.js";

export const getBookingTrend = async (req, res, next) => {
  try {
    const { range } = req.query;
    const data = await fetchBookingTrend(range);
    return ApiResponse.success(res, "Booking trend fetched", data);
  } catch (error) {
    next(error);
  }
};

export const getRevenueTrend = async (req, res, next) => {
  try {
    const { range } = req.query;
    const data = await fetchRevenueTrend(range);
    return ApiResponse.success(res, "Revenue trend fetched", data);
  } catch (error) {
    next(error);
  }
};

export const getUserGrowth = async (req, res, next) => {
  try {
    const { range } = req.query;
    const data = await fetchUserGrowth(range);
    return ApiResponse.success(res, "User growth fetched", data);
  } catch (error) {
    next(error);
  }
};

export const getTopGuiders = async (req, res, next) => {
  try {
    const data = await fetchTopGuiders();
    return ApiResponse.success(res, "Top guiders fetched", data);
  } catch (error) {
    next(error);
  }
};

export const getTopPhotographers = async (req, res, next) => {
  try {
    const data = await fetchTopPhotographers();
    return ApiResponse.success(res, "Top photographers fetched", data);
  } catch (error) {
    next(error);
  }
};

export const getBookingStatus = async (req, res, next) => {
  try {
    const data = await fetchBookingStatus();
    return ApiResponse.success(res, "Booking status fetched", data);
  } catch (error) {
    next(error);
  }
};