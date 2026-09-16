// booking.repository.js
import Booking from "../../database/models/core/Booking.js";
import Place from "../../database/models/core/Place.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import User from "../../database/models/core/User.js";
import { Op } from "sequelize";

const includeOptions = [
  // Customer (the user who booked)
  {
    model: User,
    as: "User",
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
            as: "User",
            attributes: ["id", "firstName", "lastName", "phone", "email"],
          },
        ],
        attributes: ["id", "fullName", "profilePhotoUrl", "userId"],
      },
    ],
    attributes: ["id", "price"],
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
            as: "User",
            attributes: ["id", "firstName", "lastName", "phone", "email"],
          },
        ],
        attributes: ["id", "fullName", "profilePhotoUrl", "userId"],
      },
    ],
    attributes: ["id", "price"],
  },
];

export const createBooking = async (payload) => {
  return await Booking.create(payload);
};

export const getBookings = async () => {
  return await Booking.findAll({
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

export const getBookingById = async (id) => {
  return await Booking.findByPk(id, { include: includeOptions });
};

export const getBookingsByUserId = async (userId) => {
  return await Booking.findAll({
    where: { userId },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

export const getBookingsByGuiderId = async (guiderId) => {
  const plans = await GuiderPlan.findAll({ where: { guiderId }, attributes: ["id"] });
  const planIds = plans.map((p) => p.id);
  return await Booking.findAll({
    where: { guiderPlanId: planIds },
    include: includeOptions,
    order: [["createdAt", "DESC"]],
  });
};

export const getBookingsByPhotographerId = async (photographerId) => {
  const plans = await PhotographerPlan.findAll({ where: { photographerId }, attributes: ["id"] });
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
  await booking.update({ completionOtp: otp, completionOtpExpiresAt: expiresAt });
  return booking;
};

// ✅ New helper for conflict check
export const getProviderBookings = async (planIds, statuses, providerType) => {
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