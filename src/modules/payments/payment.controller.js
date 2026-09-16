// src/modules/payments/payment.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchAllPayments,
  fetchPaymentById,
} from "./payment.service.js";

export const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const order = await createRazorpayOrder(bookingId);
    return ApiResponse.success(res, "Order created", order);
  } catch (error) { next(error); }
};

export const confirmPayment = async (req, res, next) => {
  try {
    const result = await verifyPaymentSignature(req.body);
    return ApiResponse.success(res, "Payment confirmed successfully", result);
  } catch (error) { next(error); }
};

export const getPayments = async (req, res, next) => {
  try {
    const payments = await fetchAllPayments(req.query);
    return ApiResponse.success(res, "Payments fetched successfully", payments);
  } catch (error) { next(error); }
};

// ✅ Added
export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await fetchPaymentById(req.params.id);
    return ApiResponse.success(res, "Payment fetched successfully", payment);
  } catch (error) { next(error); }
};