// src/modules/bookings/booking.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addBooking,
  fetchBookings,
  fetchBooking,
  fetchMyBookings,
  fetchGuiderBookings,
  fetchPhotographerBookings,
  changeBookingStatus,
  cancelMyBooking,
  requestCompletion,
  verifyCompletion,
} from "./booking.service.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import { ApiError } from "../../utils/apiError.js";

export const createBooking = async (req, res, next) => {
  try {
    const booking = await addBooking(req.user.id, req.body);
    return ApiResponse.success(res, "Booking created", booking);
  } catch (error) { next(error); }
};

export const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await fetchBookings();
    return ApiResponse.success(res, "Bookings fetched", bookings);
  } catch (error) { next(error); }
};

export const getBooking = async (req, res, next) => {
  try {
    const booking = await fetchBooking(req.params.id);
    return ApiResponse.success(res, "Booking fetched", booking);
  } catch (error) { next(error); }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await fetchMyBookings(req.user.id);
    return ApiResponse.success(res, "My bookings", bookings);
  } catch (error) { next(error); }
};

export const getGuiderBookings = async (req, res, next) => {
  try {
    const guider = await Guider.findOne({ where: { userId: req.user.id } });
    if (!guider) throw new ApiError(404, "Guider profile not found");
    const bookings = await fetchGuiderBookings(guider.id);
    return ApiResponse.success(res, "Guider bookings", bookings);
  } catch (error) { next(error); }
};

export const getPhotographerBookings = async (req, res, next) => {
  try {
    const photographer = await Photographer.findOne({ where: { userId: req.user.id } });
    if (!photographer) throw new ApiError(404, "Photographer profile not found");
    const bookings = await fetchPhotographerBookings(photographer.id);
    return ApiResponse.success(res, "Photographer bookings", bookings);
  } catch (error) { next(error); }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const booking = await changeBookingStatus(req.params.id, status, notes);
    return ApiResponse.success(res, "Status updated", booking);
  } catch (error) { next(error); }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await cancelMyBooking(req.user.id, req.params.id, reason);
    return ApiResponse.success(res, "Booking cancelled", booking);
  } catch (error) { next(error); }
};

export const completeRequest = async (req, res, next) => {
  try {
    const booking = await requestCompletion(req.user.id, req.params.id, req.user.role);
    return ApiResponse.success(res, "Completion request sent", booking);
  } catch (error) { next(error); }
};

// ✅ UPDATED: Emit `booking:completed` socket event → customer ko review popup trigger ho
export const completeVerify = async (req, res, next) => {
  try {
    const booking = await verifyCompletion(req.user.id, req.params.id, req.body.otp);

    // ✅ Emit socket event to the CUSTOMER so they can be prompted for review
    try {
      const io = req.app.get("io");
      if (io && booking?.userId) {
        io.to(`user:${booking.userId}`).emit("booking:completed", {
          bookingId: booking.id,
        });
        console.log(`📡 booking:completed emitted → user:${booking.userId}`);
      } else {
        console.log("⚠️ Socket emit skipped — io or booking.userId missing");
      }
    } catch (socketErr) {
      console.error("❌ Socket emit failed:", socketErr.message);
      // don't fail the request
    }

    return ApiResponse.success(res, "Booking completed", booking);
  } catch (error) { next(error); }
};