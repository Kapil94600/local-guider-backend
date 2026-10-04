// src/modules/notifications/notification.repository.js
import Notification from "../../database/models/core/Notification.js";
import Booking from "../../database/models/core/Booking.js";
import User from "../../database/models/core/User.js";
import Place from "../../database/models/core/Place.js";
import GuiderPlan from "../../database/models/core/GuiderPlan.js";
import PhotographerPlan from "../../database/models/core/PhotographerPlan.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createNotification = async (payload) => {
  return await Notification.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// FETCH by user (paginated)
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
// ✅ NEW: Get notification with FULL booking details
// ═══════════════════════════════════════════════════════════════
export const getNotificationWithDetails = async (id, userId) => {
  const notification = await Notification.findOne({
    where: { id, userId },
    include: [
      {
        model: User,
        as: "user",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "profileImage",
          "role",
        ],
      },
    ],
  });

  if (!notification) return null;

  // Agar BOOKING type hai aur data me bookingId hai → full booking fetch karo
  let booking = null;
  const bookingId = notification.data?.bookingId;

  if (bookingId) {
    try {
      booking = await Booking.findByPk(bookingId, {
        include: [
          {
            model: User,
            as: "customer",
            attributes: [
              "id",
              "firstName",
              "lastName",
              "email",
              "phone",
              "profileImage",
            ],
          },
          {
            model: Place,
            as: "place",
            attributes: ["id", "name", "address", "city", "state", "imageUrl"],
          },
          {
            model: GuiderPlan,
            as: "guiderPlan",
            include: [
              {
                model: Guider,
                as: "guider",
                attributes: ["id", "fullName", "userId"],
                include: [
                  {
                    model: User,
                    attributes: [
                      "id",
                      "firstName",
                      "lastName",
                      "phone",
                      "profileImage",
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: PhotographerPlan,
            as: "photographerPlan",
            include: [
              {
                model: Photographer,
                as: "photographer",
                attributes: ["id", "fullName", "userId"],
                include: [
                  {
                    model: User,
                    attributes: [
                      "id",
                      "firstName",
                      "lastName",
                      "phone",
                      "profileImage",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    } catch (err) {
      console.error(`Booking fetch failed for notif ${id}: ${err.message}`);
    }
  }

  return {
    ...notification.toJSON(),
    booking: booking ? booking.toJSON() : null,
  };
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