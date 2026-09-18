// src/modules/bookings/booking.service.js
import {
  createBooking,
  getBookings,
  getBookingById,
  getBookingsByUserId,
  getBookingsByGuiderId,
  getBookingsByPhotographerId,
  updateBookingStatus,
  saveCompletionOtp,
  getProviderBookings,
} from "./booking.repository.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import User from "../../database/models/core/User.js";
import { generateOtp } from "../../utils/otp.js";
import { ApiError } from "../../utils/apiError.js";
import { addNotification } from "../notifications/notification.service.js";

// ═══════════════════════════════════════════════════════════════
// HELPER: Booking conflict check
// ═══════════════════════════════════════════════════════════════
const checkBookingConflict = async (providerId, providerType, newStart, durationMinutes) => {
  let planIds = [];
  if (providerType === "GUIDER") {
    const plans = await GuiderPlan.findAll({ where: { guiderId: providerId }, attributes: ["id"] });
    planIds = plans.map((p) => p.id);
  } else if (providerType === "PHOTOGRAPHER") {
    const plans = await PhotographerPlan.findAll({ where: { photographerId: providerId }, attributes: ["id"] });
    planIds = plans.map((p) => p.id);
  } else {
    return null;
  }
  if (planIds.length === 0) return null;

  const activeStatuses = ["PENDING", "APPROVED"];
  const bookings = await getProviderBookings(planIds, activeStatuses, providerType);

  const newStartTime = new Date(newStart);
  const newEndTime = new Date(newStartTime.getTime() + durationMinutes * 60000);

  let conflict = false;
  let earliestNextStart = null;

  for (const booking of bookings) {
    let bookingDuration = 0;
    if (booking.guiderPlan) bookingDuration = booking.guiderPlan.duration || 0;
    if (booking.photographerPlan) bookingDuration = booking.photographerPlan.duration || 0;
    if (bookingDuration === 0) continue;

    const bookingStart = new Date(booking.bookingDate);
    const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);

    const overlaps = newStartTime < bookingEnd && newEndTime > bookingStart;
    if (overlaps) {
      conflict = true;
      const nextAvailable = new Date(bookingEnd.getTime() + 30 * 60000);
      if (!earliestNextStart || nextAvailable < earliestNextStart) {
        earliestNextStart = nextAvailable;
      }
    }
  }

  if (conflict && earliestNextStart) {
    const options = { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    const nextTimeStr = earliestNextStart.toLocaleString("en-US", options);
    return { conflict: true, nextAvailable: nextTimeStr };
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Resolve provider user from booking
// ═══════════════════════════════════════════════════════════════
const resolveProviderUser = async (booking) => {
  if (booking.guiderPlanId) {
    const plan = await GuiderPlan.findByPk(booking.guiderPlanId);
    if (plan) {
      const guider = await Guider.findByPk(plan.guiderId);
      if (guider) return await User.findByPk(guider.userId);
    }
  } else if (booking.photographerPlanId) {
    const plan = await PhotographerPlan.findByPk(booking.photographerPlanId);
    if (plan) {
      const photographer = await Photographer.findByPk(plan.photographerId);
      if (photographer) return await User.findByPk(photographer.userId);
    }
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════
// ADD BOOKING
// ═══════════════════════════════════════════════════════════════
export const addBooking = async (userId, payload) => {
  let totalAmount = 0;
  let providerId = null;
  let providerType = null;
  let duration = 0;

  if (payload.guiderPlanId) {
    const plan = await GuiderPlan.findByPk(payload.guiderPlanId);
    if (plan) {
      totalAmount += parseFloat(plan.price) || 0;
      providerId = plan.guiderId;
      providerType = "GUIDER";
      duration = plan.duration || 0;
    }
  } else if (payload.photographerPlanId) {
    const plan = await PhotographerPlan.findByPk(payload.photographerPlanId);
    if (plan) {
      totalAmount += parseFloat(plan.price) || 0;
      providerId = plan.photographerId;
      providerType = "PHOTOGRAPHER";
      duration = plan.duration || 0;
    }
  }

  if (providerId && duration > 0 && payload.bookingDate) {
    const conflict = await checkBookingConflict(providerId, providerType, payload.bookingDate, duration);
    if (conflict) {
      throw new ApiError(
        409,
        `The provider already has a booking at this time. The next available slot is: ${conflict.nextAvailable}. Please select a later time.`
      );
    }
  }

  if (!payload.guiderPlanId && !payload.photographerPlanId && payload.totalAmount) {
    totalAmount = payload.totalAmount;
  }

  return await createBooking({
    ...payload,
    userId,
    totalAmount,
    status: "PENDING",
  });
};

export const fetchBookings = async () => getBookings();

export const fetchBooking = async (id) => {
  const booking = await getBookingById(id);
  if (!booking) throw new ApiError(404, "Booking not found");
  return booking;
};

export const fetchMyBookings = async (userId) => getBookingsByUserId(userId);
export const fetchGuiderBookings = async (guiderId) => getBookingsByGuiderId(guiderId);
export const fetchPhotographerBookings = async (photographerId) => getBookingsByPhotographerId(photographerId);

// ═══════════════════════════════════════════════════════════════
// ✅ FIX #3 + #5: CHANGE BOOKING STATUS
//   - initiatorId: jis user ne action liya — usko notify nahi karenge
//   - CANCELLED / REJECTED pe OTP fields clear karenge (fix #3)
//   - Notification message me OTP / sensitive data nahi jaayega
// ═══════════════════════════════════════════════════════════════
export const changeBookingStatus = async (
  id,
  status,
  notes = null,
  initiatorId = null   // ✅ NEW: skip notifying the actor
) => {
  const allowed = ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];
  if (!allowed.includes(status)) throw new ApiError(400, "Invalid status");

  const booking = await getBookingById(id);
  if (!booking) throw new ApiError(404, "Booking not found");

  // ── Build update payload ──
  const updatePayload = { status };

  if ((status === "REJECTED" || status === "CANCELLED") && notes) {
    updatePayload.notes = notes;
  }

  // ✅ FIX #3: OTP fields clear karo jab booking close ho rahi
  if (status === "CANCELLED" || status === "REJECTED") {
    updatePayload.completionOtp = null;
    updatePayload.completionOtpExpiresAt = null;
    updatePayload.completionOtpVerified = false;
  }

  await booking.update(updatePayload);
  const updatedBooking = await getBookingById(id);

  // ── Resolve parties ──
  const customer = await User.findByPk(booking.userId);
  const providerUser = await resolveProviderUser(booking);

  const bookingIdShort = booking.id.slice(0, 8);
  const statusLower = status.toLowerCase();

  // ── Sanitize notes for notification (remove any OTP-like 6-digit codes) ──
  const safeNotes = notes ? String(notes).replace(/\b\d{6}\b/g, "[hidden]") : null;

  // ═══════════════════════════════════════════════════════════════
  // NOTIFY CUSTOMER — skip if customer initiated the change
  // ═══════════════════════════════════════════════════════════════
  if (customer && customer.id !== initiatorId) {
    let title = `Booking ${statusLower}`;
    let message = `Your booking #${bookingIdShort} has been ${statusLower}.`;
    if (safeNotes) message += ` Reason: ${safeNotes}`;

    await addNotification({
      userId: customer.id,
      title,
      message,
      type: "BOOKING",
      data: { bookingId: booking.id, status }, // ✅ no OTP in data
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFY PROVIDER — skip if provider initiated the change
  // ═══════════════════════════════════════════════════════════════
  if (providerUser && providerUser.id !== initiatorId) {
    let title, message;
    if (status === "APPROVED") {
      title = "Booking Approved";
      message = `You approved booking #${bookingIdShort}.`;
    } else if (status === "REJECTED") {
      title = "Booking Rejected";
      message = `You rejected booking #${bookingIdShort}. Reason: ${safeNotes || "No reason"}`;
    } else if (status === "CANCELLED") {
      title = "Booking Cancelled";
      message = `Booking #${bookingIdShort} was cancelled. Reason: ${safeNotes || "No reason"}`;
    } else {
      title = `Booking ${statusLower}`;
      message = `Booking #${bookingIdShort} status changed to ${statusLower}.`;
    }

    await addNotification({
      userId: providerUser.id,
      title,
      message,
      type: "BOOKING",
      data: { bookingId: booking.id, status }, // ✅ no OTP in data
    });
  }

  return updatedBooking;
};

// ═══════════════════════════════════════════════════════════════
// CANCEL MY BOOKING
//   ✅ FIX #5: initiatorId pass karo taaki khud ko notification na jaaye
// ═══════════════════════════════════════════════════════════════
export const cancelMyBooking = async (userId, bookingId, reason = null) => {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  let isAuthorized = false;
  let initiatorRole = "USER";

  if (booking.userId === userId) {
    isAuthorized = true;
    initiatorRole = "CUSTOMER";
  } else {
    if (booking.guiderPlanId) {
      const plan = await GuiderPlan.findByPk(booking.guiderPlanId);
      if (plan) {
        const guider = await Guider.findByPk(plan.guiderId);
        if (guider && guider.userId === userId) {
          isAuthorized = true;
          initiatorRole = "PROVIDER";
        }
      }
    } else if (booking.photographerPlanId) {
      const plan = await PhotographerPlan.findByPk(booking.photographerPlanId);
      if (plan) {
        const photographer = await Photographer.findByPk(plan.photographerId);
        if (photographer && photographer.userId === userId) {
          isAuthorized = true;
          initiatorRole = "PROVIDER";
        }
      }
    }
  }

  if (!isAuthorized) throw new ApiError(403, "Not allowed");

  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
    throw new ApiError(400, "Cannot cancel now");
  }

  // ✅ initiatorId pass karo — khud ko notification nahi jaayegi
  return await changeBookingStatus(bookingId, "CANCELLED", reason, userId);
};

// ═══════════════════════════════════════════════════════════════
// REQUEST COMPLETION (generates OTP)
//   ✅ FIX #3: OTP kabhi bhi provider ke notification me nahi jaayega
// ═══════════════════════════════════════════════════════════════
export const requestCompletion = async (providerId, bookingId, role) => {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "APPROVED") throw new ApiError(400, "Booking must be approved first");

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const updated = await saveCompletionOtp(bookingId, otp, expiresAt);

  // ✅ LOG OTP — for testing/debugging only
  console.log("═══════════════════════════════════════");
  console.log("🔑 COMPLETION OTP GENERATED");
  console.log("   Booking ID:", bookingId);
  console.log("   OTP       :", otp);
  console.log("   Expires At:", expiresAt.toISOString());
  console.log("   Customer  :", booking.userId);
  console.log("   Provider  :", providerId);
  console.log("═══════════════════════════════════════");

  const customer = await User.findByPk(booking.userId);

  // ✅ OTP SIRF CUSTOMER ko jaayega — provider ko nahi
  if (customer) {
    // SMS (console fallback)
    if (customer.phone) {
      try {
        const { sendSms } = await import("../../utils/smsService.js");
        await sendSms({
          to: customer.phone,
          body: `Your Local Guider booking completion OTP is ${otp}. Valid for 10 minutes. Share only with your provider.`,
        });
        console.log(`📱 OTP sent via SMS to ${customer.phone}`);
      } catch (smsError) {
        console.log(`⚠️ SMS failed for OTP: ${smsError.message}`);
      }
    }

    // ✅ In-app notification to CUSTOMER ONLY
    await addNotification({
      userId: customer.id,
      title: "Completion OTP Requested",
      message: `Your booking #${booking.id.slice(0, 8)} is being completed. Your OTP is: ${otp}. Please share it with your provider.`,
      type: "BOOKING",
      data: { bookingId: booking.id, otp }, // ✅ OTP only in customer's data
    });
  }

  // ✅ FIX #3: Provider ko sirf "OTP requested" notification jaayegi — OTP value NAHI
  const providerUser = await User.findByPk(providerId);
  if (providerUser) {
    await addNotification({
      userId: providerUser.id,
      title: "Completion OTP Sent",
      message: `OTP has been sent to the customer for booking #${booking.id.slice(0, 8)}. Ask them to share it.`,
      type: "BOOKING",
      data: { bookingId: booking.id }, // ✅ NO OTP
    });
  }

  return updated;
};

// ═══════════════════════════════════════════════════════════════
// VERIFY COMPLETION
// ═══════════════════════════════════════════════════════════════
export const verifyCompletion = async (userId, bookingId, otp) => {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  let isProvider = false;
  if (booking.guiderPlanId) {
    const plan = await GuiderPlan.findByPk(booking.guiderPlanId);
    if (plan) {
      const guider = await Guider.findByPk(plan.guiderId);
      if (guider && guider.userId === userId) isProvider = true;
    }
  }
  if (booking.photographerPlanId) {
    const plan = await PhotographerPlan.findByPk(booking.photographerPlanId);
    if (plan) {
      const photographer = await Photographer.findByPk(plan.photographerId);
      if (photographer && photographer.userId === userId) isProvider = true;
    }
  }

  if (!isProvider) {
    throw new ApiError(403, "Only the provider can verify the OTP");
  }

  if (booking.completionOtp !== otp || booking.completionOtpExpiresAt < new Date()) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  const updated = await updateBookingStatus(bookingId, "COMPLETED");
  await booking.update({ completionOtpVerified: true });

  const customer = await User.findByPk(booking.userId);
  if (customer) {
    await addNotification({
      userId: customer.id,
      title: "Booking Completed",
      message: `Your booking #${booking.id.slice(0, 8)} has been marked as completed.`,
      type: "BOOKING",
    });
  }

  const providerUser = await User.findByPk(userId);
  if (providerUser) {
    await addNotification({
      userId: providerUser.id,
      title: "Booking Completed",
      message: `You have completed booking #${booking.id.slice(0, 8)}.`,
      type: "BOOKING",
    });
  }

  return updated;
};