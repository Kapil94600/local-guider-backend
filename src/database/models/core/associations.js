// ═══════════════════════════════════════════════════════════════
// src/database/models/core/associations.js
// ═══════════════════════════════════════════════════════════════
import User from "./User.js";
import Wallet from "./Wallet.js";
import WalletTransaction from "./WalletTransaction.js";
import Guider from "./Guider.js";
import Photographer from "./Photographer.js";
import Booking from "./Booking.js";
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
  // User & Wallet
  User.hasOne(Wallet, { foreignKey: "userId" });
  Wallet.belongsTo(User, { foreignKey: "userId" });

  Wallet.hasMany(WalletTransaction, { foreignKey: "walletId" });
  WalletTransaction.belongsTo(Wallet, { foreignKey: "walletId" });

  User.hasMany(RefreshToken, { foreignKey: "userId" });
  RefreshToken.belongsTo(User, { foreignKey: "userId" });

  // Reset Tokens
  User.hasMany(ResetToken, { foreignKey: "userId" });
  ResetToken.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(Device, { foreignKey: "userId" });
  Device.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(Notification, { foreignKey: "userId" });
  Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(RoleRequest, { foreignKey: "userId" });
  // ✅ FIX: alias "user" added — admin controller `as: "user"` use karta hai
  RoleRequest.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(Favorite, { foreignKey: "userId" });
  Favorite.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(Review, { foreignKey: "userId" });
  Review.belongsTo(User, { foreignKey: "userId" });

  User.hasOne(Guider, { foreignKey: "userId" });
  Guider.belongsTo(User, { foreignKey: "userId" });

  User.hasOne(Photographer, { foreignKey: "userId" });
  Photographer.belongsTo(User, { foreignKey: "userId" });

  Guider.hasMany(GuiderPlan, { foreignKey: "guiderId", as: "plans" });
  GuiderPlan.belongsTo(Guider, { foreignKey: "guiderId", as: "guider" });

  Photographer.hasMany(PhotographerPlan, { foreignKey: "photographerId", as: "plans" });
  PhotographerPlan.belongsTo(Photographer, { foreignKey: "photographerId", as: "photographer" });

  Booking.belongsTo(User, { foreignKey: "userId" });
  User.hasMany(Booking, { foreignKey: "userId" });

  Booking.belongsTo(Place, { foreignKey: "placeId", as: "place" });
  Place.hasMany(Booking, { foreignKey: "placeId", as: "bookings" });

  Booking.belongsTo(GuiderPlan, { foreignKey: "guiderPlanId", as: "guiderPlan" });
  GuiderPlan.hasMany(Booking, { foreignKey: "guiderPlanId", as: "bookings" });

  Booking.belongsTo(PhotographerPlan, { foreignKey: "photographerPlanId", as: "photographerPlan" });
  PhotographerPlan.hasMany(Booking, { foreignKey: "photographerPlanId", as: "bookings" });

  User.hasMany(IdCard, { foreignKey: "userId" });
  IdCard.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(Block, { foreignKey: "userId" });
  Block.belongsTo(User, { as: "blocker", foreignKey: "userId" });
  User.hasMany(Block, { as: "blockedBy", foreignKey: "blockedUserId" });
  Block.belongsTo(User, { as: "blocked", foreignKey: "blockedUserId" });

  Conversation.belongsTo(User, { as: "participant1", foreignKey: "participant1Id" });
  User.hasMany(Conversation, { as: "conversationsAsParticipant1", foreignKey: "participant1Id" });
  Conversation.belongsTo(User, { as: "participant2", foreignKey: "participant2Id" });
  User.hasMany(Conversation, { as: "conversationsAsParticipant2", foreignKey: "participant2Id" });
  Conversation.hasMany(Message, { foreignKey: "conversationId", as: "messages" });
  Message.belongsTo(Conversation, { foreignKey: "conversationId" });
  Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });
  User.hasMany(Message, { foreignKey: "senderId" });

  User.hasMany(WithdrawalRequest, { foreignKey: "userId" });
  WithdrawalRequest.belongsTo(User, { foreignKey: "userId" });
};