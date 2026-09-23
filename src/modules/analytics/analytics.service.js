// src/modules/analytics/analytics.service.js
import {
  getBookingTrend,
  getRevenueTrend,
  getUserGrowth,
  getTopGuiders,
  getTopPhotographers,
  getBookingStatus,
} from "./analytics.repository.js";

export const fetchBookingTrend = async (range) => getBookingTrend(range);
export const fetchRevenueTrend = async (range) => getRevenueTrend(range);
export const fetchUserGrowth = async (range) => getUserGrowth(range);
export const fetchTopGuiders = async () => getTopGuiders();
export const fetchTopPhotographers = async () => getTopPhotographers();
export const fetchBookingStatus = async () => getBookingStatus();