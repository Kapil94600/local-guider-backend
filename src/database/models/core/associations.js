// ═══════════════════════════════════════════════════════════════
// src/database/models/core/associations.js
// ═══════════════════════════════════════════════════════════════
import User from "./User.js";
import Wallet from "./Wallet.js";
import WalletTransaction from "./WalletTransaction.js";
import Guider from "./Guider.js";
import Photographer from "./Photographer.js";
import Booking from "./Booking.js";
import BookingStatusHistory from "./BookingStatusHistory.js";
import Review from "./Review.js";
import Favorite from "./Favorite.js";
import Place from "./Place.js";
import GuiderPlan from "./GuiderPlan.js";
import PhotographerPlan from "./PhotographerPlan.js";
import RefreshToken from "./RefreshToken.js";
import Notification from "./Notification.js";
import RoleRequest from "./RoleRequest.js";
import Device from "./Device.js";
import IdCard from "./IdCard.js";
import Offer from "./Offer.js";
import Block from "./Block.js";
import Conversation from "./Conversation.js";
import Message from "./Message.js";
import WithdrawalRequest from "./WithdrawalRequest.js";
import ResetToken from "./ResetToken.js";

export const setupAssociations = () => {
  // ═══════════════════════════════════════════════════════════════
  // USER & WALLET
  // ═══════════════════════════════════════════════════════════════
  User.hasOne(Wallet, { foreignKey: "userId" });
  Wallet.belongsTo(User, { foreignKey: "userId" });

  Wallet.hasMany(WalletTransaction, { foreignKey: "walletId" });
  WalletTransaction.belongsTo(Wallet, { foreignKey: "walletId" });

  User.hasMany(RefreshToken, { foreignKey: "userId" });
  RefreshToken.belongsTo(User, { foreignKey: "userId" });

  // ✅ FIX: RefreshToken ↔ Device association
  Device.hasMany(RefreshToken, { foreignKey: "deviceId" });
  RefreshToken.belongsTo(Device, { foreignKey: "deviceId" });

  // ═══════════════════════════════════════════════════════════════
  // RESET TOKENS
  // ═══════════════════════════════════════════════════════════════
  User.hasMany(ResetToken, { foreignKey: "userId" });
  ResetToken.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(Device, { foreignKey: "userId" });
  Device.belongsTo(User, { foreignKey: "userId" });

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  User.hasMany(Notification, { foreignKey: "userId" });
  Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

  // ═══════════════════════════════════════════════════════════════
  // ROLE REQUESTS
  // ═══════════════════════════════════════════════════════════════
  User.hasMany(RoleRequest, { foreignKey: "userId" });
  RoleRequest.belongsTo(User, { foreignKey: "userId", as: "user" });

  // ═══════════════════════════════════════════════════════════════
  // FAVORITES & REVIEWS
  // ═══════════════════════════════════════════════════════════════
  User.hasMany(Favorite, { foreignKey: "userId" });
  Favorite.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(Review, { foreignKey: "userId" });
  Review.belongsTo(User, { foreignKey: "userId" });

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER PROFILES
  // ═══════════════════════════════════════════════════════════════
  User.hasOne(Guider, { foreignKey: "userId" });
  Guider.belongsTo(User, { foreignKey: "userId" });

  User.hasOne(Photographer, { foreignKey: "userId" });
  Photographer.belongsTo(User, { foreignKey: "userId" });

  Guider.hasMany(GuiderPlan, { foreignKey: "guiderId", as: "plans" });
  GuiderPlan.belongsTo(Guider, { foreignKey: "guiderId", as: "guider" });

  Photographer.hasMany(PhotographerPlan, {
    foreignKey: "photographerId",
    as: "plans",
  });
  PhotographerPlan.belongsTo(Photographer, {
    foreignKey: "photographerId",
    as: "photographer",
  });

  // ═══════════════════════════════════════════════════════════════
  // BOOKINGS
  // ═══════════════════════════════════════════════════════════════
  Booking.belongsTo(User, { foreignKey: "userId" });
  User.hasMany(Booking, { foreignKey: "userId" });

  Booking.belongsTo(Place, { foreignKey: "placeId", as: "place" });
  Place.hasMany(Booking, { foreignKey: "placeId", as: "bookings" });

  Booking.belongsTo(GuiderPlan, {
    foreignKey: "guiderPlanId",
    as: "guiderPlan",
  });
  GuiderPlan.hasMany(Booking, {
    foreignKey: "guiderPlanId",
    as: "bookings",
  });

  Booking.belongsTo(PhotographerPlan, {
    foreignKey: "photographerPlanId",
    as: "photographerPlan",
  });
  PhotographerPlan.hasMany(Booking, {
    foreignKey: "photographerPlanId",
    as: "bookings",
  });

  // ═══════════════════════════════════════════════════════════════
  // ✅ FIX: BOOKING STATUS HISTORY — FK field mismatch
  // ═══════════════════════════════════════════════════════════════
  // Actual DB column is `changed_by_id` (snake_case)
  // Sequelize association must specify BOTH name + field
  // ═══════════════════════════════════════════════════════════════
  Booking.hasMany(BookingStatusHistory, {
    foreignKey: "bookingId",
    as: "statusHistory",
    onDelete: "CASCADE",
  });

  BookingStatusHistory.belongsTo(Booking, {
    foreignKey: "bookingId",
    as: "booking",
  });

  // ✅ CRITICAL FIX: field mapping
  BookingStatusHistory.belongsTo(User, {
    foreignKey: {
      name: "changedById",       // model attribute
      field: "changed_by_id",    // actual DB column
    },
    as: "changedBy",
    constraints: false,
  });

  // ═══════════════════════════════════════════════════════════════
  // ID CARDS
  // ═══════════════════════════════════════════════════════════════
  User.hasMany(IdCard, { foreignKey: "userId" });
  IdCard.belongsTo(User, { foreignKey: "userId" });

  // ═══════════════════════════════════════════════════════════════
  // BLOCKS — clear aliases to avoid confusion
  // ═══════════════════════════════════════════════════════════════
  User.hasMany(Block, { as: "blocksGiven", foreignKey: "userId" });
  Block.belongsTo(User, { as: "blocker", foreignKey: "userId" });

  User.hasMany(Block, { as: "blocksReceived", foreignKey: "blockedUserId" });
  Block.belongsTo(User, { as: "blocked", foreignKey: "blockedUserId" });

  // ═══════════════════════════════════════════════════════════════
  // CHAT (Conversations + Messages)
  // ═══════════════════════════════════════════════════════════════
  Conversation.belongsTo(User, {
    as: "participant1",
    foreignKey: "participant1Id",
  });
  User.hasMany(Conversation, {
    as: "conversationsAsParticipant1",
    foreignKey: "participant1Id",
  });

  Conversation.belongsTo(User, {
    as: "participant2",
    foreignKey: "participant2Id",
  });
  User.hasMany(Conversation, {
    as: "conversationsAsParticipant2",
    foreignKey: "participant2Id",
  });

  Conversation.hasMany(Message, {
    foreignKey: "conversationId",
    as: "messages",
  });
  Message.belongsTo(Conversation, { foreignKey: "conversationId" });

  Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });
  User.hasMany(Message, { as: "sentMessages", foreignKey: "senderId" });

  // ═══════════════════════════════════════════════════════════════
  // WITHDRAWALS
  // ═══════════════════════════════════════════════════════════════
  User.hasMany(WithdrawalRequest, { foreignKey: "userId" });
  WithdrawalRequest.belongsTo(User, { foreignKey: "userId" });

  // ✅ NEW: Track which admin processed the withdrawal
  WithdrawalRequest.belongsTo(User, {
    as: "processedBy",
    foreignKey: "processedById",
    constraints: false,
  });
};