// src/modules/analytics/analytics.repository.js
import { Op, fn, col, literal } from "sequelize";
import User from "../../database/models/core/User.js";
import Booking from "../../database/models/core/Booking.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ═══════════════════════════════════════════════════════════════
// Parse range → months
// ═══════════════════════════════════════════════════════════════
const parseRangeToMonths = (range) => {
  if (!range || typeof range !== "string") return 6;
  const lower = range.toLowerCase().trim();

  if (lower.endsWith("d")) {
    const days = parseInt(lower, 10) || 30;
    return Math.max(1, Math.ceil(days / 30));
  }
  if (lower.endsWith("m")) {
    return parseInt(lower, 10) || 6;
  }
  if (lower.endsWith("y")) {
    return (parseInt(lower, 10) || 1) * 12;
  }
  return 6;
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: Fill missing months with zero values
// ═══════════════════════════════════════════════════════════════
const fillMissingMonths = (data, months, valueKey) => {
  const byMonth = new Map();
  data.forEach((row) => {
    byMonth.set(row.month, row);
  });

  const result = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    // Use unique key "Mon YYYY" for dedupe
    const uniqueKey = `${monthName} ${year}`;

    // Find matching row from data
    const match = data.find((r) => {
      const rDate = new Date(r.month);
      return (
        MONTH_NAMES[rDate.getMonth()] === monthName &&
        rDate.getFullYear() === year
      );
    });

    result.push(
      match || {
        month: monthName,
        [valueKey]: 0,
      }
    );
  }

  return result;
};

// ═══════════════════════════════════════════════════════════════
// BOOKING TREND
// ═══════════════════════════════════════════════════════════════
export const getBookingTrend = async (range = "180d") => {
  const months = parseRangeToMonths(range);
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

  const mapped = results.map((r) => ({
    month: r.month,
    bookings: Number(r.bookings),
  }));

  // ✅ Fill gaps
  return fillMissingMonths(mapped, months, "bookings").map((r) => ({
    month: typeof r.month === "string" ? r.month : MONTH_NAMES[new Date(r.month).getMonth()],
    bookings: r.bookings,
  }));
};

// ═══════════════════════════════════════════════════════════════
// REVENUE TREND
// ═══════════════════════════════════════════════════════════════
export const getRevenueTrend = async (range = "180d") => {
  const months = parseRangeToMonths(range);
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);

  const results = await WalletTransaction.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("SUM", col("amount")), "revenue"],
    ],
    where: {
      createdAt: { [Op.gte]: start },
      transactionType: "DEBIT",
    },
    group: [literal("month")],
    order: [[literal("month"), "ASC"]],
    raw: true,
  });

  const mapped = results.map((r) => ({
    month: r.month,
    revenue: Number(r.revenue || 0),
  }));

  return fillMissingMonths(mapped, months, "revenue").map((r) => ({
    month: typeof r.month === "string" ? r.month : MONTH_NAMES[new Date(r.month).getMonth()],
    revenue: r.revenue,
  }));
};

// ═══════════════════════════════════════════════════════════════
// USER GROWTH
// ═══════════════════════════════════════════════════════════════
export const getUserGrowth = async (range = "180d") => {
  const months = parseRangeToMonths(range);
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

  const mapped = results.map((r) => ({
    month: r.month,
    users: Number(r.users),
  }));

  return fillMissingMonths(mapped, months, "users").map((r) => ({
    month: typeof r.month === "string" ? r.month : MONTH_NAMES[new Date(r.month).getMonth()],
    users: r.users,
  }));
};

// ═══════════════════════════════════════════════════════════════
// TOP GUIDERS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// TOP PHOTOGRAPHERS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// BOOKING STATUS
// ═══════════════════════════════════════════════════════════════
export const getBookingStatus = async () => {
  const results = await Booking.findAll({
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    group: ["status"],
    raw: true,
  });

  return results.map((r) => ({
    status: r.status,
    count: Number(r.count),
  }));
};