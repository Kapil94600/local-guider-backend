import User from "../../database/models/core/User.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import Place from "../../database/models/core/Place.js";
import Booking from "../../database/models/core/Booking.js";
import Review from "../../database/models/core/Review.js";
import Favorite from "../../database/models/core/Favorite.js";
import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";
import RoleRequest from "../../database/models/core/RoleRequest.js"; // ✅ Added missing import

export const getDashboardStats = async () => {
  const users = await User.count();
  const guiders = await Guider.count();
  const photographers = await Photographer.count();
  const places = await Place.count();
  const bookings = await Booking.count();
  const reviews = await Review.count();
  const favorites = await Favorite.count();
  const roleRequests = await RoleRequest.count(); // ✅ Now works

  // Wallet balance total
  const wallets = await Wallet.findAll();
  const walletBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);

  // Total revenue from WalletTransactions (optional)
  const transactions = await WalletTransaction.findAll();
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
    pendingRoleRequests: roleRequests,
    totalSliders: 0,  // Add Slider.count() if slider model exists
    totalOffers: 0,   // Add Offer.count() if offer model exists
    totalIdCards: 0,  // Add IdCard.count() if id card model exists
    // Add more fields as needed for charts
    userGrowth: [],   // You can populate from real data later
    bookingTrend: [],
    revenueByCategory: [],
    recentUsers: [],
    recentRoleRequests: [],
  };
};