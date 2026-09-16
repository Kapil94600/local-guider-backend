import { Op } from "sequelize";
import User from "../../database/models/core/User.js";
import Wallet from "../../database/models/core/Wallet.js";
import Booking from "../../database/models/core/Booking.js";
import Review from "../../database/models/core/Review.js";
import Favorite from "../../database/models/core/Favorite.js";

export const findUserByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

export const createAdminUser = async (payload) => {
  return await User.create(payload);
};

// ✅ Saare filters + pagination
export const getAllUsers = async ({ search, role, status, page = 1, limit = 10 }) => {
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
  if (status && status !== "ALL") where.isActive = status === "true" ? true : false;

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ["passwordHash", "resetTokenHash", "resetTokenExpires"] },
    include: [
      { model: Wallet, as: "Wallet", attributes: ["balance"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  return { rows, count };
};

// ✅ Single user with all details
export const getUserById = async (id) => {
  return await User.findByPk(id, {
    attributes: { exclude: ["passwordHash", "resetTokenHash", "resetTokenExpires"] },
    include: [
      { model: Wallet, as: "Wallet", attributes: ["balance"] },
      { model: Booking, as: "Bookings", attributes: ["id", "status", "totalAmount", "bookingDate"] },
      { model: Review, as: "Reviews", attributes: ["id", "rating", "comment"] },
      { model: Favorite, as: "Favorites", attributes: ["id", "type", "referenceId"] },
    ],
  });
};

export const updateUserStatus = async (id, isActive) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update({ isActive });
  return user;
};

export const deleteUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.destroy();
  return true;
};