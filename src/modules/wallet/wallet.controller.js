import { ApiResponse } from "../../utils/apiResponse.js";
import {
  getWallet,
  getWalletTransactions,
  getAllWalletsService,
  updateWalletBalanceService,
} from "./wallet.service.js";   // ✅ Correct import

export const wallet = async (req, res, next) => {
  try {
    const data = await getWallet(req.user.id);
    return ApiResponse.success(res, "Wallet fetched successfully", data);
  } catch (error) {
    next(error);
  }
};

export const transactions = async (req, res, next) => {
  try {
    const data = await getWalletTransactions(req.user.id);
    return ApiResponse.success(res, "Transactions fetched successfully", data);
  } catch (error) {
    next(error);
  }
};

export const getAllWallets = async (req, res, next) => {
  try {
    const data = await getAllWalletsService(req.query);
    return ApiResponse.success(res, "All wallets fetched", data);
  } catch (error) {
    next(error);
  }
};

export const updateWalletBalance = async (req, res, next) => {
  try {
    const { amount, type, description } = req.body;
    const data = await updateWalletBalanceService(req.params.userId, amount, type, description);
    return ApiResponse.success(res, "Wallet balance updated", data);
  } catch (error) {
    next(error);
  }
};