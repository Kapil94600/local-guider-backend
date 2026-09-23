// src/modules/bookings/booking.repository.js
import { Op } from "sequelize";
import Booking from "../../database/models/core/Booking.js";
import BookingStatusHistory from "../../database/models/core/BookingStatusHistory.js";
import Place from "../../database/models/core/Place.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════════════════════════
// INCLUDE OPTIONS
// ═══════════════════════════════════════════════════════════════
const includeOptions = [
  {
    model: User,
    attributes: ["id", "firstName", "lastName", "phone", "email"],
  },
  { model: Place, as: "place", attributes: ["id", "name", "city"] },
  {
    model: GuiderPlan,
    as: "guiderPlan",
    include: [
      {
        model: Guider,
        as: "guider",
        include: [
          {
            model: User,
            attributes: ["id", "firstName", "lastName", "phone", "email"],
          },
        ],
        attributes: ["id", "fullName", "profilePhotoUrl", "userId"],
      },
    ],
    attributes: ["id", "price", "duration"],
  },
  {
    model: PhotographerPlan,
    as: "photographerPlan",
    include: [
      {
        model: Photographer,
        as: "photographer",
        include: [
          {
            model: User,
            attributes: ["id", "firstName", "lastName", "phone", "email"],
          },
        ],
        attributes: ["id", "fullName", "profilePhotoUrl", "userId"],
      },
    ],
    attributes: ["id", "price", "duration"],
  },
];

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createBooking = async (payload) => {
  return await Booking.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// GET BOOKINGS (with filters + pagination)
// ═══════════════════════════════════════════════════════════════
export const getBookings = async ({
  page = 1,
  limit = 20,
  search,
  status,
  type,
} = {}) => {
  const where = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (type === "GUIDER") {
    where.guiderPlanId = { [Op.ne]: null };
  } else if (type === "PHOTOGRAPHER") {
    where.photographerPlanId = { [Op.ne]: null };
  }

  if (search && search.trim()) {
    where.id = { [Op.iLike]: `%${search.trim()}%` };
  }

  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const { rows, count } = await Booking.findAndCountAll({
    where,
    include: includeOptions,
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset,
    distinct: true,
  });

  return {
    rows,
    count,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(count / safeLimit),
  };
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-8: GET BOOKING BY ID
// - If transaction (lock): fetch WITHOUT include, then separately fetch user
// - If no transaction: safe include
// ═══════════════════════════════════════════════════════════════
export const getBookingById = async (id, options = {}) => {
  const { transaction } = options;

  // ✅ LOCK MODE: no include (avoids PG "FOR UPDATE with outer join" error)
  if (transaction) {
    const booking = await Booking.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) return null;

    // ✅ Fetch related data separately (no lock)
    const fullBooking = await Booking.findByPk(id, {
      include: includeOptions,
    });

    return fullBooking;
  }

  // ✅ NO LOCK: safe include
  return await Booking.findByPk(id, {
    include: includeOptions,
  });
};

export const getBookingsByUserId = async (userId) => {
  return await Booking.findAll({
    where: { userId },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

export const getBookingsByGuiderId = async (guiderId) => {
  const plans = await GuiderPlan.findAll({
    where: { guiderId },
    attributes: ["id"],
  });
  const planIds = plans.map((p) => p.id);
  return await Booking.findAll({
    where: { guiderPlanId: planIds },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

export const getBookingsByPhotographerId = async (photographerId) => {
  const plans = await PhotographerPlan.findAll({
    where: { photographerId },
    attributes: ["id"],
  });
  const planIds = plans.map((p) => p.id);
  return await Booking.findAll({
    where: { photographerPlanId: planIds },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

export const updateBookingStatus = async (id, status) => {
  const booking = await Booking.findByPk(id);
  if (!booking) return null;
  await booking.update({ status });
  return booking;
};

export const saveCompletionOtp = async (id, otp, expiresAt) => {
  const booking = await Booking.findByPk(id);
  if (!booking) return null;
  await booking.update({
    completionOtp: otp,
    completionOtpExpiresAt: expiresAt,
  });
  return booking;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Provider bookings (conflict check)
// ═══════════════════════════════════════════════════════════════
export const getProviderBookings = async (
  planIds,
  statuses,
  providerType
) => {
  const where = {
    status: { [Op.in]: statuses },
  };
  let include = [];
  if (providerType === "GUIDER") {
    where.guiderPlanId = { [Op.in]: planIds };
    include.push({
      model: GuiderPlan,
      as: "guiderPlan",
      attributes: ["duration"],
    });
  } else if (providerType === "PHOTOGRAPHER") {
    where.photographerPlanId = { [Op.in]: planIds };
    include.push({
      model: PhotographerPlan,
      as: "photographerPlan",
      attributes: ["duration"],
    });
  } else {
    return [];
  }

  return await Booking.findAll({
    where,
    include,
    attributes: ["id", "bookingDate", "status"],
  });
};

// ═══════════════════════════════════════════════════════════════
// BOOKING STATUS HISTORY
// ═══════════════════════════════════════════════════════════════
export const recordStatusChange = async ({
  bookingId,
  fromStatus,
  toStatus,
  changedById = null,
  changedByRole = "SYSTEM",
  note = null,
  metadata = {},
  transaction = null,
}) => {
  return await BookingStatusHistory.create(
    {
      bookingId,
      fromStatus,
      toStatus,
      changedById,
      changedByRole,
      note,
      metadata,
    },
    { transaction }
  );
};

export const getBookingStatusHistory = async (bookingId) => {
  return await BookingStatusHistory.findAll({
    where: { bookingId },
    include: [
      {
        model: User,
        as: "changedBy",
        attributes: ["id", "firstName", "lastName", "role"],
        required: false,
      },
    ],
    order: [["createdAt", "ASC"]],
  });
};