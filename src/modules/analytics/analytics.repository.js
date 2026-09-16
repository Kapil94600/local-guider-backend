// src/modules/analytics/analytics.repository.js
import { Op, fn, col, literal } from "sequelize";
import { sequelize } from "../../config/database.js";
import User from "../../database/models/core/User.js";
import Booking from "../../database/models/core/Booking.js";
import Place from "../../database/models/core/Place.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import Payment from "../../database/models/core/WalletTransaction.js";

// ---------- BOOKING TREND (monthly count) ----------
export const getBookingTrend = async (months = 6) => {
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);

  const results = await Booking.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("COUNT", col("id")), "bookings"],
    ],
    where: { createdAt: { [Op.gte]: start } },
    group: [literal("month")],
    order: [[literal("month"), "ASC"]],
    raw: true,
  });

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return results.map((r) => ({
    month: monthNames[new Date(r.month).getMonth()],
    bookings: Number(r.bookings),
  }));
};

// ---------- REVENUE TREND (monthly sum of successful payments) ----------
export const getRevenueTrend = async (months = 6) => {
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);

  const results = await Payment.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("SUM", col("amount")), "revenue"],
    ],
    where: {
      createdAt: { [Op.gte]: start },
      transactionType: "CREDIT",
    },
    group: [literal("month")],
    order: [[literal("month"), "ASC"]],
    raw: true,
  });

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return results.map((r) => ({
    month: monthNames[new Date(r.month).getMonth()],
    revenue: Number(r.revenue || 0),
  }));
};

// ---------- USER GROWTH (monthly new users) ----------
export const getUserGrowth = async (months = 6) => {
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);

  const results = await User.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("COUNT", col("id")), "users"],
    ],
    where: { createdAt: { [Op.gte]: start } },
    group: [literal("month")],
    order: [[literal("month"), "ASC"]],
    raw: true,
  });

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return results.map((r) => ({
    month: monthNames[new Date(r.month).getMonth()],
    users: Number(r.users),
  }));
};

// ---------- TOP GUIDERS (by experience) ----------
export const getTopGuiders = async (limit = 5) => {
  return Guider.findAll({
    order: [["experience", "DESC"]],
    limit,
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "profileImage"],
      },
    ],
  });
};

// ---------- TOP PHOTOGRAPHERS (by experience) ----------
export const getTopPhotographers = async (limit = 5) => {
  return Photographer.findAll({
    order: [["experience", "DESC"]],
    limit,
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName", "profileImage"],
      },
    ],
  });
};

// ---------- BOOKING STATUS DISTRIBUTION ----------
export const getBookingStatus = async () => {
  const results = await Booking.findAll({
    attributes: [
      "status",
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["status"],
    raw: true,
  });

  return results.map((r) => ({
    status: r.status,
    count: Number(r.count),
  }));
};