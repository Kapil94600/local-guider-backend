// src/modules/notifications/notification.repository.js
import Notification from "../../database/models/core/Notification.js";
import { Op } from "sequelize";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createNotification = async (payload) => {
  return await Notification.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// FETCH by user
// ═══════════════════════════════════════════════════════════════
export const getNotificationsByUser = async (
  userId,
  { page = 1, limit = 20 } = {}
) => {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);

  return await Notification.findAndCountAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });
};

export const getNotificationById = async (id) => {
  return await Notification.findByPk(id);
};

// ═══════════════════════════════════════════════════════════════
// MARK AS READ
// ═══════════════════════════════════════════════════════════════
export const markNotificationRead = async (id, userId) => {
  return await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { id, userId } }
  );
};

export const markAllNotificationsRead = async (userId) => {
  return await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { userId, isRead: false } }
  );
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const deleteNotification = async (id, userId) => {
  return await Notification.destroy({ where: { id, userId } });
};

export const deleteAllNotifications = async (userId) => {
  return await Notification.destroy({ where: { userId } });
};

// ═══════════════════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════════════════
export const getUnreadCount = async (userId) => {
  return await Notification.count({ where: { userId, isRead: false } });
};