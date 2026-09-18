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

export const getDashboardStats = async () => {
  const users = await User.count();
  const guiders = await Guider.count();
  const photographers = await Photographer.count();
  const places = await Place.count();
  const bookings = await Booking.count();
  const reviews = await Review.count();
  const favorites = await Favorite.count();

  // ✅ FIX #4: sirf PENDING role requests count karo
  const pendingRoleRequests = await RoleRequest.count({
    where: { status: "PENDING" },
  });

  // Wallet balance total
  const wallets = await Wallet.findAll();
  const walletBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);

  // Total revenue from WalletTransactions (CREDIT only)
  const transactions = await WalletTransaction.findAll({
    where: { transactionType: "CREDIT" },
  });
  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return {
    totalUsers: users,
    totalGuiders: guiders,
    totalPhotographers: photographers,
    totalPlaces: places,
    totalBookings: bookings,
    totalReviews: reviews,
    totalFavorites: favorites,
    totalRevenue: totalRevenue || walletBalance,
    pendingRoleRequests,   // ✅ ab sirf pending count
    totalSliders: 0,
    totalOffers: 0,
    totalIdCards: 0,
    userGrowth: [],
    bookingTrend: [],
    revenueByCategory: [],
    recentUsers: [],
    recentRoleRequests: [],
  };
};