import User from "./core/User.js";
import Wallet from "./core/Wallet.js";
import WalletTransaction from "./core/WalletTransaction.js";
import RefreshToken from "./core/RefreshToken.js";
import Device from "./core/Device.js";
import Place from "./core/Place.js";
import Guider from "./core/Guider.js";
import Photographer from "./core/Photographer.js";
import Booking from "./core/Booking.js";
import Review from "./core/Review.js";
import Favorite from "./core/Favorite.js";
import Notification from "./core/Notification.js";
import RoleRequest from "./core/RoleRequest.js";
import GuiderPlan from "./core/GuiderPlan.js";
import PhotographerPlan from "./core/PhotographerPlan.js";
import Slider from "./core/Slider.js";
import IdCard from "./core/IdCard.js";
import Offer from "./core/Offer.js";
import Block from "./core/Block.js";
import Conversation from "./core/Conversation.js";
import Message from "./core/Message.js";
import WithdrawalRequest from "./core/WithdrawalRequest.js";
import ResetToken from "./core/ResetToken.js";   // ✅ New

import { setupAssociations } from "./core/associations.js";

setupAssociations();

export {
  User,
  Wallet,
  WalletTransaction,
  RefreshToken,
  Device,
  Place,
  Guider,
  Photographer,
  Booking,
  Review,
  Favorite,
  Notification,
  RoleRequest,
  GuiderPlan,
  PhotographerPlan,
  Slider,
  IdCard,
  Offer,
  Block,
  Conversation,
  Message,
  WithdrawalRequest,
  ResetToken,
};