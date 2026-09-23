// src/modules/admin/admin.repository.js
import { Op, fn, col, literal } from "sequelize";
import User from "../../database/models/core/User.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import Place from "../../database/models/core/Place.js";
import Booking from "../../database/models/core/Booking.js";
import Review from "../../database/models/core/Review.js";
import Favorite from "../../database/models/core/Favorite.js";
import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";
import RoleRequest from "../../database/models/core/RoleRequest.js";

// ═══════════════════════════════════════════════════════════════
// HELPER: Calculate monthly trend % (this month vs last month)
// ═══════════════════════════════════════════════════════════════
const calcTrend = (current, previous) => {
  if (previous === 0 && current === 0) return { trend: null, trendValue: null };
  if (previous === 0) {
    return { trend: "up", trendValue: "+100%" };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.abs(pct).toFixed(1);
  return {
    trend: pct >= 0 ? "up" : "down",
    trendValue: `${pct >= 0 ? "+" : "-"}${rounded}%`,
  };
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Get month boundaries
// ═══════════════════════════════════════════════════════════════
const getMonthBounds = () => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { startOfThisMonth, startOfLastMonth };
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Count this month vs last month for any model
// ═══════════════════════════════════════════════════════════════
const getMonthlyTrend = async (Model) => {
  const { startOfThisMonth, startOfLastMonth } = getMonthBounds();
  const [thisMonth, lastMonth] = await Promise.all([
    Model.count({ where: { createdAt: { [Op.gte]: startOfThisMonth } } }),
    Model.count({
      where: {
        createdAt: {
          [Op.gte]: startOfLastMonth,
          [Op.lt]: startOfThisMonth,
        },
      },
    }),
  ]);
  return calcTrend(thisMonth, lastMonth);
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS — 100% real data + real trends
// ═══════════════════════════════════════════════════════════════
export const getDashboardStats = async () => {
  const { startOfThisMonth, startOfLastMonth } = getMonthBounds();

  // ── All counts in parallel ──
  const [
    totalUsers,
    totalGuiders,
    totalPhotographers,
    totalPlaces,
    totalBookings,
    totalReviews,
    totalFavorites,
    pendingRoleRequests,
  ] = await Promise.all([
    User.count(),
    Guider.count(),
    Photographer.count(),
    Place.count(),
    Booking.count(),
    Review.count(),
    Favorite.count(),
    RoleRequest.count({ where: { status: "PENDING" } }),
  ]);

  // ── Real trends for each metric ──
  const [
    usersTrend,
    guidersTrend,
    photographersTrend,
    bookingsTrend,
    reviewsTrend,
    placesTrend,
  ] = await Promise.all([
    getMonthlyTrend(User),
    getMonthlyTrend(Guider),
    getMonthlyTrend(Photographer),
    getMonthlyTrend(Booking),
    getMonthlyTrend(Review),
    getMonthlyTrend(Place),
  ]);

  // ── Total wallet balance ──
  const walletSum = await Wallet.sum("balance");
  const walletBalance = Number(walletSum || 0);

  // ── Total revenue — DEBIT only ──
  const revenueSum = await WalletTransaction.sum("amount", {
    where: { transactionType: "DEBIT" },
  });
  const totalRevenue = Number(revenueSum || 0);

  // ── Revenue trend: this month vs last month ──
  const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
    WalletTransaction.sum("amount", {
      where: {
        transactionType: "DEBIT",
        createdAt: { [Op.gte]: startOfThisMonth },
      },
    }),
    WalletTransaction.sum("amount", {
      where: {
        transactionType: "DEBIT",
        createdAt: {
          [Op.gte]: startOfLastMonth,
          [Op.lt]: startOfThisMonth,
        },
      },
    }),
  ]);
  const revenueTrend = calcTrend(
    Number(thisMonthRevenue || 0),
    Number(lastMonthRevenue || 0)
  );

  // ── Recent users ──
  const recentUsersData = await User.findAll({
    attributes: ["id", "firstName", "lastName", "email", "role", "profileImage", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 5,
  });

  // ── Recent role requests ──
  const recentRoleRequestsData = await RoleRequest.findAll({
    attributes: ["id", "userId", "requestedRole", "fullName", "companyName", "location", "status", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 5,
  });

  // ── Last 8 months growth data ──
  const eightMonthsAgo = new Date();
  eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 7);
  eightMonthsAgo.setDate(1);

  const userGrowthRaw = await User.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("COUNT", col("id")), "count"],
    ],
    where: { createdAt: { [Op.gte]: eightMonthsAgo } },
    group: [literal("month")],
    order: [[literal("month"), "ASC"]],
    raw: true,
  });

  const bookingTrendRaw = await Booking.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("COUNT", col("id")), "count"],
    ],
    where: { createdAt: { [Op.gte]: eightMonthsAgo } },
    group: [literal("month")],
    order: [[literal("month"), "ASC"]],
    raw: true,
  });

  const revenueByMonthRaw = await WalletTransaction.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("SUM", col("amount")), "total"],
    ],
    where: {
      transactionType: "DEBIT",
      createdAt: { [Op.gte]: eightMonthsAgo },
    },
    group: [literal("month")],
    order: [[literal("month"), "ASC"]],
    raw: true,
  });

  const monthName = (m) =>
    new Date(m).toLocaleDateString("en-US", { month: "short" });

  return {
    // Counts
    totalUsers,
    totalGuiders,
    totalPhotographers,
    totalPlaces,
    totalBookings,
    totalReviews,
    totalFavorites,
    pendingRoleRequests,

    // Money
    totalRevenue,
    walletBalance,
    revenueTrend, // ✅ { trend: "up", trendValue: "+9.2%" }

    // ✅ Real trends for each metric
    usersTrend,          // ✅ { trend: "up", trendValue: "+12%" }
    guidersTrend,
    photographersTrend,
    bookingsTrend,
    reviewsTrend,
    placesTrend,

    // Trend data
    userGrowth: userGrowthRaw.map((r) => ({
      month: monthName(r.month),
      users: Number(r.count),
    })),
    bookingTrend: bookingTrendRaw.map((r) => ({
      month: monthName(r.month),
      bookings: Number(r.count),
    })),
    revenueByMonth: revenueByMonthRaw.map((r) => ({
      month: monthName(r.month),
      revenue: Number(r.total),
    })),

    // Recent lists
    recentUsers: recentUsersData.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      profileImage: u.profileImage,
      createdAt: u.createdAt,
    })),
    recentRoleRequests: recentRoleRequestsData.map((r) => ({
      id: r.id,
      userId: r.userId,
      requestedRole: r.requestedRole,
      fullName: r.fullName,
      companyName: r.companyName,
      location: r.location,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
};