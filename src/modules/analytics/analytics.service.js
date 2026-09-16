// src/modules/analytics/analytics.service.js
import {
  getBookingTrend,
  getRevenueTrend,
  getUserGrowth,
  getTopGuiders,
  getTopPhotographers,
  getBookingStatus,
} from "./analytics.repository.js";

export const fetchBookingTrend = async () => getBookingTrend();
export const fetchRevenueTrend = async () => getRevenueTrend();
export const fetchUserGrowth = async () => getUserGrowth();
export const fetchTopGuiders = async () => getTopGuiders();
export const fetchTopPhotographers = async () => getTopPhotographers();
export const fetchBookingStatus = async () => getBookingStatus();