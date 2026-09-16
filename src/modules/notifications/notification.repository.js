import Notification from "../../database/models/core/Notification.js";
import { Op } from "sequelize";

export const createNotification = async (payload) => {
  return await Notification.create(payload);
};

export const getNotificationsByUser = async (userId, { page = 1, limit = 20 } = {}) => {
  return await Notification.findAndCountAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
};

export const getNotificationById = async (id) => {
  return await Notification.findByPk(id);
};

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

export const deleteNotification = async (id, userId) => {
  return await Notification.destroy({ where: { id, userId } });
};

export const deleteAllNotifications = async (userId) => {
  return await Notification.destroy({ where: { userId } });
};

export const getUnreadCount = async (userId) => {
  return await Notification.count({ where: { userId, isRead: false } });
};