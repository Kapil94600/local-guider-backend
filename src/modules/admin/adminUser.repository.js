// src/modules/admin/adminUser.repository.js
import { Op } from "sequelize";
import User from "../../database/models/core/User.js";
import Wallet from "../../database/models/core/Wallet.js";
import WalletTransaction from "../../database/models/core/WalletTransaction.js";
import Booking from "../../database/models/core/Booking.js";
import Review from "../../database/models/core/Review.js";
import Favorite from "../../database/models/core/Favorite.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import IdCard from "../../database/models/core/IdCard.js";
import RoleRequest from "../../database/models/core/RoleRequest.js";
import RefreshToken from "../../database/models/core/RefreshToken.js";
import ResetToken from "../../database/models/core/ResetToken.js";
import Device from "../../database/models/core/Device.js";
import Notification from "../../database/models/core/Notification.js";
import Block from "../../database/models/core/Block.js";
import Conversation from "../../database/models/core/Conversation.js";
import Message from "../../database/models/core/Message.js";
import WithdrawalRequest from "../../database/models/core/WithdrawalRequest.js";
import { sequelize } from "../../config/database.js";

export const findUserByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

export const createAdminUser = async (payload) => {
  return await User.create(payload);
};

// ✅ Saare filters + pagination
export const getAllUsers = async ({
  search,
  role,
  status,
  page = 1,
  limit = 10,
}) => {
  const where = {};

  // Search (name/email/phone)
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Role filter
  if (role && role !== "ALL") where.role = role;

  // Status filter (true/false)
  if (status && status !== "ALL")
    where.isActive = status === "true" ? true : false;

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: {
      exclude: ["passwordHash", "resetTokenHash", "resetTokenExpires"],
    },
    include: [{ model: Wallet, as: "Wallet", attributes: ["balance"] }],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  return { rows, count };
};

// ✅ Single user with all details
export const getUserById = async (id) => {
  return await User.findByPk(id, {
    attributes: {
      exclude: ["passwordHash", "resetTokenHash", "resetTokenExpires"],
    },
    include: [
      { model: Wallet, as: "Wallet", attributes: ["balance"] },
      {
        model: Booking,
        as: "Bookings",
        attributes: ["id", "status", "totalAmount", "bookingDate"],
      },
      { model: Review, as: "Reviews", attributes: ["id", "rating", "comment"] },
      {
        model: Favorite,
        as: "Favorites",
        attributes: ["id", "type", "referenceId"],
      },
    ],
  });
};

export const updateUserStatus = async (id, isActive) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update({ isActive });
  return user;
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIXED: deleteUserById — cascade delete all related records
// ═══════════════════════════════════════════════════════════════
export const deleteUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) return null;

  const transaction = await sequelize.transaction();

  try {
    console.log(`🗑️  Deleting user ${id} (${user.email})...`);

    // 1. Delete provider plans (Guider/Photographer plans)
    const guider = await Guider.findOne({
      where: { userId: id },
      transaction,
    });
    if (guider) {
      await GuiderPlan.destroy({ where: { guiderId: guider.id }, transaction });
      await guider.destroy({ transaction });
      console.log("   ✅ Guider + plans deleted");
    }

    const photographer = await Photographer.findOne({
      where: { userId: id },
      transaction,
    });
    if (photographer) {
      await PhotographerPlan.destroy({
        where: { photographerId: photographer.id },
        transaction,
      });
      await photographer.destroy({ transaction });
      console.log("   ✅ Photographer + plans deleted");
    }

    // 2. IdCards
    await IdCard.destroy({ where: { userId: id }, transaction });

    // 3. Role Requests
    await RoleRequest.destroy({ where: { userId: id }, transaction });

    // 4. Wallet transactions (via wallet)
    const wallet = await Wallet.findOne({
      where: { userId: id },
      transaction,
    });
    if (wallet) {
      await WalletTransaction.destroy({
        where: { walletId: wallet.id },
        transaction,
      });
      await wallet.destroy({ transaction });
    }

    // 5. Bookings, Reviews, Favorites
    await Booking.destroy({ where: { userId: id }, transaction });
    await Review.destroy({ where: { userId: id }, transaction });
    await Favorite.destroy({ where: { userId: id }, transaction });

    // 6. Auth tokens + devices + notifications
    await RefreshToken.destroy({ where: { userId: id }, transaction });
    await ResetToken.destroy({ where: { userId: id }, transaction });
    await Device.destroy({ where: { userId: id }, transaction });
    await Notification.destroy({ where: { userId: id }, transaction });

    // 7. Blocks (both directions)
    await Block.destroy({ where: { userId: id }, transaction });
    await Block.destroy({ where: { blockedUserId: id }, transaction });

    // 8. Withdrawal Requests
    await WithdrawalRequest.destroy({ where: { userId: id }, transaction });

    // 9. Chat — messages sent by user, and conversations involving user
    await Message.destroy({ where: { senderId: id }, transaction });
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ participant1Id: id }, { participant2Id: id }],
      },
      attributes: ["id"],
      transaction,
    });
    const convIds = conversations.map((c) => c.id);
    if (convIds.length > 0) {
      await Message.destroy({
        where: { conversationId: convIds },
        transaction,
      });
      await Conversation.destroy({ where: { id: convIds }, transaction });
    }

    // 10. Finally, delete user
    await user.destroy({ transaction });

    await transaction.commit();
    console.log(`✅ User ${id} deleted successfully\n`);
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Delete user failed for ${id}:`, error.message);
    throw error;
  }
};