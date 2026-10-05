// src/modules/bookings/booking.repository.js
// ═══════════════════════════════════════════════════════════════
// BOOKING REPOSITORY
// ✅ FIXED: Sequelize alias mismatch — "user" → "User"
// ✅ FIXED: Plan attributes (title, description, placeIds) included
// ✅ FIXED: Place attributes (state, address, image) included
// ═══════════════════════════════════════════════════════════════
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
// ✅ FIXED: includeOptions
//    - Alias must match model association exactly ("User" capital U)
//    - Plan attributes now include title, description, placeIds
//    - Place attributes now include state, address, image
// ═══════════════════════════════════════════════════════════════
const includeOptions = [
  // ─── Customer (User) ───
  {
    model: User,
    as: "User",
    attributes: ["id", "firstName", "lastName", "phone", "email"],
  },

  // ─── Place ───
  {
    model: Place,
    as: "place",
    attributes: ["id", "name", "city", "state", "address", "image"],
  },

  // ─── Guider Plan ───
  {
    model: GuiderPlan,
    as: "guiderPlan",
    attributes: [
      "id",
      "title",          // ✅ ADDED
      "description",    // ✅ ADDED
      "price",
      "duration",
      "placeIds",       // ✅ ADDED
      "isActive",       // ✅ ADDED
    ],
    include: [
      {
        model: Guider,
        as: "guider",
        attributes: ["id", "fullName", "profilePhotoUrl", "userId"],
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "firstName", "lastName", "phone", "email"],
          },
        ],
      },
    ],
  },

  // ─── Photographer Plan ───
  {
    model: PhotographerPlan,
    as: "photographerPlan",
    attributes: [
      "id",
      "title",          // ✅ ADDED
      "description",    // ✅ ADDED
      "price",
      "duration",
      "placeIds",       // ✅ ADDED
      "isActive",       // ✅ ADDED
    ],
    include: [
      {
        model: Photographer,
        as: "photographer",
        attributes: ["id", "fullName", "profilePhotoUrl", "userId"],
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "firstName", "lastName", "phone", "email"],
          },
        ],
      },
    ],
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
// GET BOOKING BY ID
// ═══════════════════════════════════════════════════════════════
export const getBookingById = async (id, options = {}) => {
  const { transaction } = options;

  if (transaction) {
    const booking = await Booking.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) return null;

    const fullBooking = await Booking.findByPk(id, {
      include: includeOptions,
    });

    return fullBooking;
  }

  return await Booking.findByPk(id, {
    include: includeOptions,
  });
};

// ═══════════════════════════════════════════════════════════════
// GET BOOKINGS BY USER ID (customer)
// ═══════════════════════════════════════════════════════════════
export const getBookingsByUserId = async (userId) => {
  return await Booking.findAll({
    where: { userId },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// GET BOOKINGS BY GUIDER ID (provider)
// ═══════════════════════════════════════════════════════════════
export const getBookingsByGuiderId = async (guiderId) => {
  const plans = await GuiderPlan.findAll({
    where: { guiderId },
    attributes: ["id"],
  });
  const planIds = plans.map((p) => p.id);

  if (planIds.length === 0) return [];

  return await Booking.findAll({
    where: { guiderPlanId: { [Op.in]: planIds } },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// GET BOOKINGS BY PHOTOGRAPHER ID (provider)
// ═══════════════════════════════════════════════════════════════
export const getBookingsByPhotographerId = async (photographerId) => {
  const plans = await PhotographerPlan.findAll({
    where: { photographerId },
    attributes: ["id"],
  });
  const planIds = plans.map((p) => p.id);

  if (planIds.length === 0) return [];

  return await Booking.findAll({
    where: { photographerPlanId: { [Op.in]: planIds } },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// UPDATE BOOKING STATUS
// ═══════════════════════════════════════════════════════════════
export const updateBookingStatus = async (id, status) => {
  const booking = await Booking.findByPk(id);
  if (!booking) return null;
  await booking.update({ status });
  return booking;
};

// ═══════════════════════════════════════════════════════════════
// SAVE COMPLETION OTP
// ═══════════════════════════════════════════════════════════════
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
// HELPER: Provider bookings (for conflict check)
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