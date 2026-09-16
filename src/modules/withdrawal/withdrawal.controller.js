// src/modules/withdrawal/withdrawal.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  submitWithdrawalRequest,
  fetchMyWithdrawalRequests,
  fetchAllWithdrawalRequests,
  fetchWithdrawalRequestById,
  processWithdrawalRequest,
} from "./withdrawal.service.js";

export const createWithdrawalRequest = async (req, res, next) => {
  try {
    const request = await submitWithdrawalRequest(req.user.id, req.body);
    return ApiResponse.success(res, "Withdrawal request submitted", request);
  } catch (error) { next(error); }
};

export const getMyWithdrawalRequests = async (req, res, next) => {
  try {
    const requests = await fetchMyWithdrawalRequests(req.user.id);
    return ApiResponse.success(res, "Withdrawal requests fetched", requests);
  } catch (error) { next(error); }
};

export const getAllWithdrawalRequests = async (req, res, next) => {
  try {
    const requests = await fetchAllWithdrawalRequests(req.query);
    return ApiResponse.success(res, "All withdrawal requests fetched", requests);
  } catch (error) { next(error); }
};

// ✅ Added
export const getWithdrawalRequestById = async (req, res, next) => {
  try {
    const request = await fetchWithdrawalRequestById(req.params.id);
    return ApiResponse.success(res, "Withdrawal request fetched", request);
  } catch (error) { next(error); }
};

export const updateWithdrawalStatus = async (req, res, next) => {
  try {
    const { status, adminMessage } = req.body;
    const request = await processWithdrawalRequest(req.params.id, status, adminMessage);
    return ApiResponse.success(res, `Withdrawal request ${status.toLowerCase()}`, request);
  } catch (error) { next(error); }
};