// src/modules/bookings/booking.service.js
// ═══════════════════════════════════════════════════════════════
// BOOKING SERVICE — full status flow + OTP + refunds + notifications
// ✅ FIXED: placeId validation — throws error if invalid place
// ✅ FIXED: placeId explicitly set in createBooking payload
// ✅ FIXED: Sequelize alias "User" (capital U)
// ═══════════════════════════════════════════════════════════════
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
  recordStatusChange,
  getBookingStatusHistory,
} from "./booking.repository.js";
import Booking from "../../database/models/core/Booking.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import User from "../../database/models/core/User.js";
import Place from "../../database/models/core/Place.js";
import { sequelize } from "../../config/database.js";
import { generateOtp } from "../../utils/otp.js";
import { ApiError } from "../../utils/apiError.js";
import { addNotification } from "../notifications/notification.service.js";
import { refundWalletForBooking } from "../payments/payment.service.js";
import { logger } from "../../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// ROLE-BASED STATUS TRANSITION RULES
// ═══════════════════════════════════════════════════════════════
const ALLOWED_TRANSITIONS = {
  PROVIDER: {
    PENDING: ["APPROVED", "REJECTED"],
    APPROVED: ["CANCELLED"],
    PAID: ["CANCELLED"],
  },
  CUSTOMER: {
    PENDING: ["CANCELLED"],
    APPROVED: ["CANCELLED"],
    PAID: ["CANCELLED"],
  },
  ADMIN: {
    PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["CANCELLED", "PAID", "COMPLETED"],
    PAID: ["CANCELLED", "COMPLETED"],
    REJECTED: [],
    CANCELLED: [],
    COMPLETED: [],
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS — for rich notification text
// ═══════════════════════════════════════════════════════════════
const formatBookingDate = (date) => {
  try {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
};

const getCustomerName = (user) => {
  if (!user) return "A customer";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || "A customer";
};

const getProviderName = (guider, photographer) => {
  if (guider?.fullName) return guider.fullName;
  if (photographer?.fullName) return photographer.fullName;
  if (guider?.User) {
    return `${guider.User.firstName || ""} ${guider.User.lastName || ""}`.trim();
  }
  if (photographer?.User) {
    return `${photographer.User.firstName || ""} ${
      photographer.User.lastName || ""
    }`.trim();
  }
  return "Provider";
};

// ═══════════════════════════════════════════════════════════════
// resolveProviderUser — SYNC
// ═══════════════════════════════════════════════════════════════
export const resolveProviderUser = (booking) => {
  if (!booking) return null;

  const guiderUser = booking.guiderPlan?.guider?.User;
  if (guiderUser) return guiderUser;

  const photographerUser = booking.photographerPlan?.photographer?.User;
  if (photographerUser) return photographerUser;

  return null;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Check if user is the provider
// ═══════════════════════════════════════════════════════════════
const isUserProvider = async (userId, booking) => {
  try {
    const guiderUserId = booking.guiderPlan?.guider?.userId;
    if (guiderUserId) return guiderUserId === userId;

    const photographerUserId = booking.photographerPlan?.photographer?.userId;
    if (photographerUserId) return photographerUserId === userId;

    if (booking.guiderPlanId) {
      const plan = await GuiderPlan.findByPk(booking.guiderPlanId);
      if (plan) {
        const guider = await Guider.findByPk(plan.guiderId);
        if (guider && guider.userId === userId) return true;
      }
    }
    if (booking.photographerPlanId) {
      const plan = await PhotographerPlan.findByPk(
        booking.photographerPlanId
      );
      if (plan) {
        const photographer = await Photographer.findByPk(plan.photographerId);
        if (photographer && photographer.userId === userId) return true;
      }
    }
  } catch (err) {
    logger.error(`isUserProvider error: ${err.message}`);
  }
  return false;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Booking conflict check
// ═══════════════════════════════════════════════════════════════
const checkBookingConflict = async (
  providerId,
  providerType,
  newStart,
  durationMinutes
) => {
  let planIds = [];
  if (providerType === "GUIDER") {
    const plans = await GuiderPlan.findAll({
      where: { guiderId: providerId },
      attributes: ["id"],
    });
    planIds = plans.map((p) => p.id);
  } else if (providerType === "PHOTOGRAPHER") {
    const plans = await PhotographerPlan.findAll({
      where: { photographerId: providerId },
      attributes: ["id"],
    });
    planIds = plans.map((p) => p.id);
  } else {
    return null;
  }
  if (planIds.length === 0) return null;

  const activeStatuses = ["PENDING", "APPROVED", "PAID"];
  const bookings = await getProviderBookings(
    planIds,
    activeStatuses,
    providerType
  );

  const newStartTime = new Date(newStart);
  const newEndTime = new Date(
    newStartTime.getTime() + durationMinutes * 60000
  );

  let conflict = false;
  let earliestNextStart = null;

  for (const booking of bookings) {
    let bookingDuration = 0;
    if (booking.guiderPlan) bookingDuration = booking.guiderPlan.duration || 0;
    if (booking.photographerPlan)
      bookingDuration = booking.photographerPlan.duration || 0;
    if (bookingDuration === 0) continue;

    const bookingStart = new Date(booking.bookingDate);
    const bookingEnd = new Date(
      bookingStart.getTime() + bookingDuration * 60000
    );

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
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const nextTimeStr = earliestNextStart.toLocaleString("en-US", options);
    return { conflict: true, nextAvailable: nextTimeStr };
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Notify all admins
// ═══════════════════════════════════════════════════════════════
const notifyAllAdmins = async ({
  title,
  message,
  bookingId,
  status = null,
}) => {
  try {
    const admins = await User.findAll({
      where: {
        role: "ADMIN",
        isActive: true,
      },
      attributes: ["id", "firstName", "email"],
    });

    if (admins.length === 0) {
      logger.warn(`⚠️ No active admins to notify about booking ${bookingId}`);
      return;
    }

    logger.info(
      `📢 Notifying ${admins.length} admin(s) about booking ${bookingId.slice(0, 8)}`
    );

    for (const admin of admins) {
      try {
        await addNotification({
          userId: admin.id,
          title,
          message,
          type: "BOOKING",
          data: {
            bookingId,
            status,
            url: `localguider://booking/${bookingId}`,
          },
          channels: ["IN_APP", "PUSH"],
        });
      } catch (e) {
        logger.error(
          `Failed to notify admin ${admin.id.slice(0, 8)}: ${e.message}`
        );
      }
    }
  } catch (err) {
    logger.error(`notifyAllAdmins error: ${err.message}`);
  }
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Build rich push text
// ═══════════════════════════════════════════════════════════════
const buildBookingPushText = ({
  customerName,
  placeName,
  providerName,
  providerRole,
  bookingDate,
  amount,
  status = "PENDING",
}) => {
  const roleLabel = providerRole === "GUIDER" ? "Guider" : "Photographer";
  const dateStr = formatBookingDate(bookingDate);
  const amountStr = `₹${parseFloat(amount || 0).toFixed(0)}`;

  let title = "";
  let body = "";

  switch (status) {
    case "PENDING":
      title = `📅 New Booking from ${customerName}`;
      body = `${placeName} · ${roleLabel}: ${providerName} · ${dateStr} · ${amountStr}`;
      break;
    case "APPROVED":
      title = `✅ Booking Approved`;
      body = `${customerName} → ${placeName} · ${dateStr} · ${amountStr}`;
      break;
    case "PAID":
      title = `💰 Payment Received`;
      body = `${customerName} paid ${amountStr} for ${placeName} · ${dateStr}`;
      break;
    case "CANCELLED":
      title = `❌ Booking Cancelled`;
      body = `${customerName} cancelled ${placeName} · ${dateStr}`;
      break;
    case "COMPLETED":
      title = `🎉 Booking Completed`;
      body = `${customerName} → ${placeName} · ${roleLabel}: ${providerName}`;
      break;
    default:
      title = `Booking Update`;
      body = `${customerName} → ${placeName} · ${dateStr}`;
  }

  return { title, body };
};

// ═══════════════════════════════════════════════════════════════
// ADD BOOKING
// ✅ FIXED: placeId validation + explicit set
// ═══════════════════════════════════════════════════════════════
export const addBooking = async (userId, payload) => {
  let totalAmount = 0;
  let providerId = null;
  let providerType = null;
  let duration = 0;
  let providerUserId = null;

  // ✅ Debug log — see what frontend sends
  logger.info(
    `📥 addBooking payload: ${JSON.stringify({
      placeId: payload.placeId,
      guiderPlanId: payload.guiderPlanId,
      photographerPlanId: payload.photographerPlanId,
      bookingDate: payload.bookingDate,
    })}`
  );

  // ✅ FIX: Validate placeId FIRST
  const finalPlaceId = payload.placeId || null;

  if (!finalPlaceId) {
    logger.warn(`⚠️ Booking created WITHOUT placeId for user ${userId}`);
    throw new ApiError(400, "Place is required for booking");
  }

  // ✅ FIX: Verify place exists
  const place = await Place.findByPk(finalPlaceId, {
    attributes: ["id", "name", "city"],
  });

  if (!place) {
    logger.warn(`⚠️ Invalid placeId: ${finalPlaceId}`);
    throw new ApiError(400, "Selected place not found");
  }

  const placeName = place.name || "Unknown Place";

  // ✅ Fetch customer for notification text
  const customer = await User.findByPk(userId, {
    attributes: ["id", "firstName", "lastName", "email", "phone"],
  });
  const customerName = getCustomerName(customer);

  // ✅ Fetch provider details
  let providerName = "Provider";
  let providerRole = "GUIDER";

  if (payload.guiderPlanId) {
    const plan = await GuiderPlan.findByPk(payload.guiderPlanId, {
      include: [
        {
          model: Guider,
          as: "guider",
          attributes: ["id", "userId", "fullName"],
          include: [
            {
              model: User,
              as: "User",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
        },
      ],
    });

    if (!plan) {
      throw new ApiError(400, "Selected guider plan not found");
    }

    totalAmount += parseFloat(plan.price) || 0;
    providerId = plan.guiderId;
    providerType = "GUIDER";
    providerRole = "GUIDER";
    duration = plan.duration || 0;

    if (plan.guider) {
      providerUserId = plan.guider.userId;
      providerName = getProviderName(plan.guider, null);
    }
  } else if (payload.photographerPlanId) {
    const plan = await PhotographerPlan.findByPk(payload.photographerPlanId, {
      include: [
        {
          model: Photographer,
          as: "photographer",
          attributes: ["id", "userId", "fullName"],
          include: [
            {
              model: User,
              as: "User",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
        },
      ],
    });

    if (!plan) {
      throw new ApiError(400, "Selected photographer plan not found");
    }

    totalAmount += parseFloat(plan.price) || 0;
    providerId = plan.photographerId;
    providerType = "PHOTOGRAPHER";
    providerRole = "PHOTOGRAPHER";
    duration = plan.duration || 0;

    if (plan.photographer) {
      providerUserId = plan.photographer.userId;
      providerName = getProviderName(null, plan.photographer);
    }
  } else {
    throw new ApiError(400, "Either guiderPlanId or photographerPlanId is required");
  }

  // Conflict check
  if (providerId && duration > 0 && payload.bookingDate) {
    const conflict = await checkBookingConflict(
      providerId,
      providerType,
      payload.bookingDate,
      duration
    );
    if (conflict) {
      throw new ApiError(
        409,
        `The provider already has a booking at this time. The next available slot is: ${conflict.nextAvailable}. Please select a later time.`
      );
    }
  }

  // ✅ FIX: Explicitly set placeId
  const booking = await createBooking({
    ...payload,
    placeId: finalPlaceId,   // ✅ Explicit
    userId,
    totalAmount,
    status: "PENDING",
    paymentStatus: "PENDING",
  });

  // Record initial status
  try {
    await recordStatusChange({
      bookingId: booking.id,
      fromStatus: null,
      toStatus: "PENDING",
      changedById: userId,
      changedByRole: "CUSTOMER",
      note: "Booking created",
      metadata: { totalAmount },
    });
  } catch (e) {
    logger.error(`Initial status history failed: ${e.message}`);
  }

  const bookingIdShort = booking.id.slice(0, 8);

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════

  // ── 1. Notify PROVIDER ──
  if (providerUserId) {
    try {
      const pushText = buildBookingPushText({
        customerName,
        placeName,
        providerName,
        providerRole,
        bookingDate: payload.bookingDate,
        amount: totalAmount,
        status: "PENDING",
      });

      await addNotification({
        userId: providerUserId,
        title: pushText.title,
        message: pushText.body,
        type: "BOOKING",
        data: {
          bookingId: booking.id,
          status: "PENDING",
          url: `localguider://booking/${booking.id}`,
        },
        channels: ["IN_APP", "PUSH"],
      });

      logger.info(
        `📢 Provider notified: ${providerName} (${providerUserId.slice(0, 8)})`
      );
    } catch (notifErr) {
      logger.error(`Provider booking notification failed: ${notifErr.message}`);
    }
  }

  // ── 2. Notify CUSTOMER ──
  try {
    await addNotification({
      userId,
      title: "✅ Booking Created",
      message: `Your booking for ${placeName} with ${providerName} has been sent. Waiting for approval.`,
      type: "BOOKING",
      data: {
        bookingId: booking.id,
        status: "PENDING",
        url: `localguider://booking/${booking.id}`,
      },
      channels: ["IN_APP", "PUSH"],
    });
  } catch (notifErr) {
    logger.error(`Customer booking notification failed: ${notifErr.message}`);
  }

  // ── 3. Notify ALL ADMINS ──
  try {
    const pushText = buildBookingPushText({
      customerName,
      placeName,
      providerName,
      providerRole,
      bookingDate: payload.bookingDate,
      amount: totalAmount,
      status: "PENDING",
    });

    await notifyAllAdmins({
      title: pushText.title,
      message: pushText.body,
      bookingId: booking.id,
      status: "PENDING",
    });
  } catch (notifErr) {
    logger.error(`Admin booking notification failed: ${notifErr.message}`);
  }

  return booking;
};

// ═══════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════
export const fetchBookings = async (params = {}) => getBookings(params);

export const fetchBooking = async (id) => {
  const booking = await getBookingById(id);
  if (!booking) throw new ApiError(404, "Booking not found");
  return booking;
};

export const fetchMyBookings = async (userId) => getBookingsByUserId(userId);

export const fetchGuiderBookings = async (guiderId) =>
  getBookingsByGuiderId(guiderId);

export const fetchPhotographerBookings = async (photographerId) =>
  getBookingsByPhotographerId(photographerId);

export const fetchBookingWithHistory = async (id) => {
  const booking = await getBookingById(id);
  if (!booking) throw new ApiError(404, "Booking not found");

  const history = await getBookingStatusHistory(id);

  return {
    ...booking.toJSON(),
    statusHistory: history,
  };
};

// ═══════════════════════════════════════════════════════════════
// CHANGE BOOKING STATUS
// ═══════════════════════════════════════════════════════════════
export const changeBookingStatus = async (
  id,
  status,
  notes = null,
  initiatorId = null,
  initiatorRole = null
) => {
  const allowed = [
    "PENDING",
    "APPROVED",
    "PAID",
    "REJECTED",
    "COMPLETED",
    "CANCELLED",
  ];
  if (!allowed.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const booking = await getBookingById(id);
  if (!booking) throw new ApiError(404, "Booking not found");

  // Role-based transition check
  if (initiatorId && initiatorRole) {
    let actor = "CUSTOMER";
    if (initiatorRole === "ADMIN") actor = "ADMIN";
    else if (await isUserProvider(initiatorId, booking)) actor = "PROVIDER";

    const rules = ALLOWED_TRANSITIONS[actor] || {};
    const allowedFromCurrent = rules[booking.status] || [];

    if (!allowedFromCurrent.includes(status)) {
      throw new ApiError(
        403,
        `You cannot change booking status from ${booking.status} to ${status}`
      );
    }
  }

  const previousStatus = booking.status;

  const t = await sequelize.transaction();

  try {
    const lockedBooking = await Booking.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lockedBooking) {
      throw new ApiError(404, "Booking not found");
    }

    const updatePayload = { status };

    if ((status === "REJECTED" || status === "CANCELLED") && notes) {
      updatePayload.notes = notes;
    }

    if (status === "CANCELLED" || status === "REJECTED") {
      updatePayload.completionOtp = null;
      updatePayload.completionOtpExpiresAt = null;
      updatePayload.completionOtpVerified = false;
    }

    await lockedBooking.update(updatePayload, { transaction: t });

    // Record status change
    try {
      let changedByRole = "SYSTEM";
      if (initiatorRole === "ADMIN") changedByRole = "ADMIN";
      else if (initiatorRole === "CUSTOMER") changedByRole = "CUSTOMER";
      else if (initiatorRole === "PROVIDER") changedByRole = "PROVIDER";
      else if (initiatorId) {
        const isProv = await isUserProvider(initiatorId, booking);
        changedByRole = isProv ? "PROVIDER" : "CUSTOMER";
      }

      await recordStatusChange({
        bookingId: lockedBooking.id,
        fromStatus: previousStatus,
        toStatus: status,
        changedById: initiatorId,
        changedByRole,
        note: notes,
        metadata: {
          totalAmount: lockedBooking.totalAmount,
          paymentStatus: lockedBooking.paymentStatus,
        },
        transaction: t,
      });
    } catch (historyErr) {
      logger.error(
        `Status history record failed for ${id.slice(0, 8)}: ${historyErr.message}`
      );
    }

    // Refund logic
    if (status === "CANCELLED" || status === "REJECTED") {
      const isPaidBooking =
        lockedBooking.status === "PAID" ||
        lockedBooking.paymentStatus === "PAID" ||
        lockedBooking.paidAt !== null;

      if (isPaidBooking) {
        try {
          await refundWalletForBooking(lockedBooking, t);
          await lockedBooking.update(
            { paymentStatus: "REFUNDED" },
            { transaction: t }
          );
          logger.info(`✅ Refunded booking ${id.slice(0, 8)}`);
        } catch (refundErr) {
          logger.error(
            `⚠️ Refund failed for booking ${id.slice(0, 8)}: ${refundErr.message}`
          );
        }
      } else {
        logger.info(
          `ℹ️ Booking ${id.slice(0, 8)} never paid — no refund needed`
        );
      }
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    logger.error(`❌ changeBookingStatus failed: ${error.message}`);
    throw error;
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATIONS (outside transaction)
  // ═══════════════════════════════════════════════════════════════
  const updatedBooking = await getBookingById(id);
  const customer = await User.findByPk(booking.userId, {
    attributes: ["id", "firstName", "lastName"],
  });
  const providerUser = resolveProviderUser(updatedBooking);

  const customerName = getCustomerName(customer);
  const placeName = updatedBooking.place?.name || "Unknown Place";
  const providerName = getProviderName(
    updatedBooking.guiderPlan?.guider,
    updatedBooking.photographerPlan?.photographer
  );
  const providerRole = updatedBooking.guiderPlanId
    ? "GUIDER"
    : "PHOTOGRAPHER";

  const bookingIdShort = booking.id.slice(0, 8);
  const statusLower = status.toLowerCase();

  const safeNotes = notes
    ? String(notes).replace(/\b\d{6}\b/g, "[hidden]")
    : null;

  const pushText = buildBookingPushText({
    customerName,
    placeName,
    providerName,
    providerRole,
    bookingDate: booking.bookingDate,
    amount: booking.totalAmount,
    status,
  });

  // ── Notify CUSTOMER ──
  if (customer && customer.id !== initiatorId) {
    let title = `Booking ${statusLower}`;
    let message = `Your booking #${bookingIdShort} has been ${statusLower}.`;

    if (status === "APPROVED") {
      title = "Booking Approved 🎉";
      message = `Provider accepted your booking for ${placeName}. Please pay ₹${booking.totalAmount} to confirm.`;
    } else if (status === "PAID") {
      title = "Payment Confirmed ✅";
      message = `Payment received for ${placeName}. Your booking is confirmed!`;
    } else if (status === "CANCELLED" && previousStatus === "PAID") {
      message = `Your booking for ${placeName} was cancelled. ₹${booking.totalAmount} has been refunded to your wallet.`;
    } else if (safeNotes) {
      message += ` Reason: ${safeNotes}`;
    }

    try {
      await addNotification({
        userId: customer.id,
        title,
        message,
        type: "BOOKING",
        data: {
          bookingId: booking.id,
          status,
          url: `localguider://booking/${booking.id}`,
        },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (e) {
      logger.error(`Customer notification failed: ${e.message}`);
    }
  }

  // ── Notify PROVIDER ──
  if (providerUser && providerUser.id !== initiatorId) {
    let title = `Booking ${statusLower}`;
    let message = `Booking #${bookingIdShort} status changed to ${statusLower}.`;

    if (status === "APPROVED") {
      title = "Booking Approved";
      message = `You approved booking for ${placeName} from ${customerName}.`;
    } else if (status === "REJECTED") {
      title = "Booking Rejected";
      message = `You rejected booking from ${customerName} for ${placeName}.`;
    } else if (status === "CANCELLED") {
      title = "Booking Cancelled";
      message = `Booking from ${customerName} for ${placeName} was cancelled.`;
    } else if (status === "PAID") {
      title = "Booking Paid 💰";
      message = `${customerName} paid ₹${booking.totalAmount} for ${placeName}. You can proceed with the trip.`;
    }

    try {
      await addNotification({
        userId: providerUser.id,
        title,
        message,
        type: "BOOKING",
        data: {
          bookingId: booking.id,
          status,
          url: `localguider://booking/${booking.id}`,
        },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (e) {
      logger.error(`Provider notification failed: ${e.message}`);
    }
  }

  // ── Notify ADMINS ──
  try {
    await notifyAllAdmins({
      title: pushText.title,
      message: pushText.body,
      bookingId: booking.id,
      status,
    });
  } catch (e) {
    logger.error(`Admin notification failed: ${e.message}`);
  }

  // ── Socket emit ──
  try {
    const { getIO } = await import("../../socket.js");
    const io = getIO?.();
    if (io) {
      io.to(`user:${booking.userId}`).emit("booking:updated", {
        bookingId: booking.id,
        status,
      });
      if (providerUser) {
        io.to(`user:${providerUser.id}`).emit("booking:updated", {
          bookingId: booking.id,
          status,
        });
      }
    }
  } catch (e) {
    logger.error(`Socket emit failed (booking:updated): ${e.message}`);
  }

  return updatedBooking;
};

// ═══════════════════════════════════════════════════════════════
// CANCEL MY BOOKING
// ═══════════════════════════════════════════════════════════════
export const cancelMyBooking = async (userId, bookingId, reason = null) => {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  let isAuthorized = false;
  let actorRole = null;

  if (booking.userId === userId) {
    isAuthorized = true;
    actorRole = "CUSTOMER";
  } else {
    isAuthorized = await isUserProvider(userId, booking);
    if (isAuthorized) actorRole = "PROVIDER";
  }

  if (!isAuthorized) throw new ApiError(403, "Not allowed");

  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
    throw new ApiError(400, "Cannot cancel now");
  }

  return await changeBookingStatus(
    bookingId,
    "CANCELLED",
    reason,
    userId,
    actorRole
  );
};

// ═══════════════════════════════════════════════════════════════
// REQUEST COMPLETION (OTP generation)
// ═══════════════════════════════════════════════════════════════
export const requestCompletion = async (providerId, bookingId, role) => {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.status !== "PAID" && booking.status !== "APPROVED") {
    throw new ApiError(
      400,
      "Booking must be paid/approved before requesting completion"
    );
  }

  const isProvider = await isUserProvider(providerId, booking);
  if (!isProvider) {
    throw new ApiError(
      403,
      "Only the assigned provider can request completion"
    );
  }

  if (booking.completionOtp && booking.completionOtpExpiresAt > new Date()) {
    logger.info(
      `ℹ️ OTP already exists for booking ${bookingId.slice(0, 8)} — reusing`
    );
    return booking;
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const updated = await saveCompletionOtp(bookingId, otp, expiresAt);

  if (process.env.NODE_ENV !== "production") {
    console.log("═══════════════════════════════════════");
    console.log("🔑 COMPLETION OTP GENERATED");
    console.log("   Booking ID:", bookingId);
    console.log("   OTP       :", otp, "(only for customer)");
    console.log("   Expires At:", expiresAt.toISOString());
    console.log("═══════════════════════════════════════");
  }

  const customer = await User.findByPk(booking.userId);

  if (customer) {
    try {
      await addNotification({
        userId: customer.id,
        title: "Completion OTP",
        message: `Your booking #${booking.id.slice(
          0,
          8
        )} is being completed. Your OTP is: ${otp}. Share ONLY with your provider.`,
        type: "BOOKING",
        data: { bookingId: booking.id },
        channels: ["IN_APP"],
      });
    } catch (e) {
      logger.error(`Customer OTP notification failed: ${e.message}`);
    }
  }

  const providerUser = await User.findByPk(providerId);
  if (providerUser) {
    try {
      await addNotification({
        userId: providerUser.id,
        title: "OTP Sent to Customer",
        message: `OTP sent to customer for booking #${booking.id.slice(
          0,
          8
        )}. Ask them to share it with you.`,
        type: "BOOKING",
        data: { bookingId: booking.id },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (e) {
      logger.error(`Provider OTP notification failed: ${e.message}`);
    }
  }

  return updated;
};

// ═══════════════════════════════════════════════════════════════
// VERIFY COMPLETION
// ═══════════════════════════════════════════════════════════════
export const verifyCompletion = async (userId, bookingId, otp) => {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  const isProvider = await isUserProvider(userId, booking);
  if (!isProvider) {
    throw new ApiError(403, "Only the assigned provider can verify the OTP");
  }

  if (booking.userId === userId) {
    throw new ApiError(403, "Customer cannot verify OTP");
  }

  if (
    !booking.completionOtp ||
    booking.completionOtp !== otp ||
    !booking.completionOtpExpiresAt ||
    booking.completionOtpExpiresAt < new Date()
  ) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  const updated = await changeBookingStatus(
    bookingId,
    "COMPLETED",
    null,
    userId,
    "PROVIDER"
  );

  await updated.update({
    completionOtpVerified: true,
    completionOtp: null,
    completionOtpExpiresAt: null,
  });

  const customer = await User.findByPk(booking.userId);
  if (customer) {
    try {
      await addNotification({
        userId: customer.id,
        title: "Booking Completed",
        message: `Your booking #${booking.id.slice(
          0,
          8
        )} has been marked as completed.`,
        type: "BOOKING",
        data: { bookingId: booking.id },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (e) {
      logger.error(`Customer completion notification failed: ${e.message}`);
    }
  }

  const providerUser = await User.findByPk(userId);
  if (providerUser) {
    try {
      await addNotification({
        userId: providerUser.id,
        title: "Booking Completed",
        message: `You have completed booking #${booking.id.slice(0, 8)}.`,
        type: "BOOKING",
        data: { bookingId: booking.id },
        channels: ["IN_APP", "PUSH"],
      });
    } catch (e) {
      logger.error(`Provider completion notification failed: ${e.message}`);
    }
  }

  return updated;
};