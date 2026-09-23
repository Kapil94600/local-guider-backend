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

// ═══════════════════════════════════════════════════════════════
// FIND USER
// ═══════════════════════════════════════════════════════════════
export const findUserByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

export const createAdminUser = async (payload) => {
  return await User.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// ✅ getAllUsers — filters + pagination + wallet include fixed
// ═══════════════════════════════════════════════════════════════
export const getAllUsers = async ({
  search,
  role,
  status,
  page = 1,
  limit = 10,
} = {}) => {
  const where = {};

  // ✅ Search by name/email/phone
  if (search && search.trim()) {
    const s = search.trim();
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${s}%` } },
      { lastName: { [Op.iLike]: `%${s}%` } },
      { email: { [Op.iLike]: `%${s}%` } },
      { phone: { [Op.iLike]: `%${s}%` } },
    ];
  }

  // ✅ Role filter
  if (role && role !== "ALL") where.role = role;

  // ✅ Status filter
  if (status && status !== "ALL") {
    where.isActive = status === "true";
  }

  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: {
      exclude: ["passwordHash", "resetTokenHash", "resetTokenExpires"],
    },
    // ✅ FIX: Wallet association has no alias — use default (Wallet)
    include: [
      {
        model: Wallet,
        attributes: ["balance", "currency", "status"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    distinct: true, // ✅ Accurate count with includes
  });

  return { rows, count };
};

// ═══════════════════════════════════════════════════════════════
// ✅ getUserById — with relations
// ═══════════════════════════════════════════════════════════════
export const getUserById = async (id) => {
  return await User.findByPk(id, {
    attributes: {
      exclude: ["passwordHash", "resetTokenHash", "resetTokenExpires"],
    },
    include: [
      {
        model: Wallet,
        attributes: ["balance", "currency", "status"],
        required: false,
      },
    ],
  });
};

// ═══════════════════════════════════════════════════════════════
// ✅ UPDATE USER STATUS
// ═══════════════════════════════════════════════════════════════
export const updateUserStatus = async (id, isActive) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update({ isActive });
  return user;
};

// ═══════════════════════════════════════════════════════════════
// ✅ CASCADE DELETE — fixed order to prevent FK violations
// ═══════════════════════════════════════════════════════════════
export const deleteUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) return null;

  const transaction = await sequelize.transaction();

  try {
    console.log(`🗑️  Deleting user ${id} (${user.email})...`);

    // ─────────────────────────────────────────────────────────
    // STEP 1: Chat — messages, then conversations
    // (must be before user deletion due to FK)
    // ─────────────────────────────────────────────────────────
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
      await Conversation.destroy({
        where: { id: convIds },
        transaction,
      });
    }
    console.log("   ✅ Chat cleanup done");

    // ─────────────────────────────────────────────────────────
    // STEP 2: Notifications, Devices, Tokens
    // ─────────────────────────────────────────────────────────
    await Notification.destroy({ where: { userId: id }, transaction });
    await Device.destroy({ where: { userId: id }, transaction });
    await RefreshToken.destroy({ where: { userId: id }, transaction });
    await ResetToken.destroy({ where: { userId: id }, transaction });
    console.log("   ✅ Tokens/devices/notifications cleanup done");

    // ─────────────────────────────────────────────────────────
    // STEP 3: Blocks (both directions)
    // ─────────────────────────────────────────────────────────
    await Block.destroy({ where: { userId: id }, transaction });
    await Block.destroy({ where: { blockedUserId: id }, transaction });
    console.log("   ✅ Blocks cleanup done");

    // ─────────────────────────────────────────────────────────
    // STEP 4: Bookings + related wallet transactions
    // ─────────────────────────────────────────────────────────
    const userBookings = await Booking.findAll({
      where: { userId: id },
      attributes: ["id"],
      transaction,
    });
    const bookingIds = userBookings.map((b) => b.id);

    if (bookingIds.length > 0) {
      await WalletTransaction.destroy({
        where: {
          referenceId: { [Op.in]: bookingIds.map(String) },
        },
        transaction,
      });
    }
    await Booking.destroy({ where: { userId: id }, transaction });
    console.log("   ✅ Bookings cleanup done");

    // ─────────────────────────────────────────────────────────
    // STEP 5: Reviews, Favorites, Withdrawals, Role Requests
    // ─────────────────────────────────────────────────────────
    await Review.destroy({ where: { userId: id }, transaction });
    await Favorite.destroy({ where: { userId: id }, transaction });
    await WithdrawalRequest.destroy({ where: { userId: id }, transaction });
    await RoleRequest.destroy({ where: { userId: id }, transaction });
    console.log("   ✅ Reviews/favorites/withdrawals/role-requests cleanup done");

    // ─────────────────────────────────────────────────────────
    // STEP 6: Provider plans → provider profiles → IdCards
    // ─────────────────────────────────────────────────────────
    const guider = await Guider.findOne({
      where: { userId: id },
      transaction,
    });
    if (guider) {
      await GuiderPlan.destroy({
        where: { guiderId: guider.id },
        transaction,
      });
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

    await IdCard.destroy({ where: { userId: id }, transaction });
    console.log("   ✅ IdCards cleanup done");

    // ─────────────────────────────────────────────────────────
    // STEP 7: Wallet + transactions
    // ─────────────────────────────────────────────────────────
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
      console.log("   ✅ Wallet + transactions deleted");
    }

    // ─────────────────────────────────────────────────────────
    // STEP 8: Finally, delete the user
    // ─────────────────────────────────────────────────────────
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