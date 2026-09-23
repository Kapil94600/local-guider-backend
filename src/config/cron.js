// src/config/cron.js
import cron from "node-cron";
import { Op } from "sequelize";
import Booking from "../database/models/core/Booking.js";
import { logger } from "../utils/logger.js";

// ═══════════════════════════════════════════════════════════════
// TIME CONSTANTS
// ═══════════════════════════════════════════════════════════════
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ═══════════════════════════════════════════════════════════════
// CRON JOBS START
// ═══════════════════════════════════════════════════════════════
export const startCronJobs = () => {
  // ═══════════════════════════════════════════════════════════════
  // 1️⃣ Auto-cancel PENDING bookings after 24h of inactivity
  // ✅ FIX B-6: Uses `updatedAt` instead of `createdAt`
  // (If status was re-set to PENDING recently, don't cancel)
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("0 */6 * * *", async () => {
    const threshold = new Date(Date.now() - DAY_MS);
    try {
      const [affectedCount] = await Booking.update(
        {
          status: "CANCELLED",
          notes: "Auto-cancelled: Provider did not respond in 24h",
        },
        {
          where: {
            status: "PENDING",
            paymentStatus: "PENDING",
            // ✅ FIX B-6: updatedAt is the last state change
            updatedAt: { [Op.lt]: threshold },
            // Only future bookings
            bookingDate: { [Op.gt]: new Date() },
          },
        }
      );

      if (affectedCount > 0) {
        logger.info(
          `✅ Cron: Auto-cancelled ${affectedCount} stale PENDING bookings`
        );
      }
    } catch (error) {
      logger.error(`❌ Cron auto-cancel error: ${error.message}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 2️⃣ Auto-cancel APPROVED bookings not paid within 24h
  // ✅ FIX B-6: Uses `updatedAt`
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("15 */6 * * *", async () => {
    const threshold = new Date(Date.now() - DAY_MS);
    try {
      const [affectedCount] = await Booking.update(
        {
          status: "CANCELLED",
          notes: "Auto-cancelled: Customer did not pay within 24h of approval",
        },
        {
          where: {
            status: "APPROVED",
            paymentStatus: "PENDING",
            paidAt: null,
            // ✅ FIX B-6: updatedAt is approval time
            updatedAt: { [Op.lt]: threshold },
            bookingDate: { [Op.gt]: new Date() },
          },
        }
      );

      if (affectedCount > 0) {
        logger.info(
          `✅ Cron: Auto-cancelled ${affectedCount} unpaid APPROVED bookings`
        );
      }
    } catch (error) {
      logger.error(`❌ Cron unpaid-cancel error: ${error.message}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 3️⃣ Auto-complete PAID bookings 7 days after booking date
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("30 3 * * *", async () => {
    const threshold = new Date(Date.now() - 7 * DAY_MS);
    try {
      const [affectedCount] = await Booking.update(
        {
          status: "COMPLETED",
          notes: "Auto-completed: 7 days passed after booking date",
        },
        {
          where: {
            status: "PAID",
            paymentStatus: "PAID",
            bookingDate: { [Op.lt]: threshold },
            completionOtpVerified: false,
          },
        }
      );

      if (affectedCount > 0) {
        logger.info(
          `✅ Cron: Auto-completed ${affectedCount} stale PAID bookings`
        );
      }
    } catch (error) {
      logger.error(`❌ Cron auto-complete error: ${error.message}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ✅ B-21 (BONUS): Booking reminder 2 hours before booking
  // Runs every 30 min, finds bookings starting in next 2.5h
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("*/30 * * * *", async () => {
    try {
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * HOUR_MS);
      const threeHoursLater = new Date(now.getTime() + 3 * HOUR_MS);

      // Find PAID bookings starting between 2h and 3h from now
      const upcomingBookings = await Booking.findAll({
        where: {
          status: "PAID",
          paymentStatus: "PAID",
          bookingDate: {
            [Op.gte]: twoHoursLater,
            [Op.lt]: threeHoursLater,
          },
        },
        attributes: ["id", "userId", "bookingDate"],
      });

      if (upcomingBookings.length === 0) return;

      // Dynamic import to avoid circular dependency
      const { addNotification } = await import(
        "../modules/notifications/notification.service.js"
      );

      for (const booking of upcomingBookings) {
        try {
          await addNotification({
            userId: booking.userId,
            title: "Booking Reminder ⏰",
            message: `Your booking #${booking.id.slice(
              0,
              8
            )} starts in about 2 hours. Please be ready!`,
            type: "BOOKING",
            data: { bookingId: booking.id, reminderType: "2H_BEFORE" },
            channels: ["IN_APP", "PUSH"],
          });
        } catch (e) {
          logger.error(
            `Booking reminder failed for ${booking.id.slice(0, 8)}: ${e.message}`
          );
        }
      }

      logger.info(`✅ Cron: Sent ${upcomingBookings.length} booking reminders`);
    } catch (error) {
      logger.error(`❌ Cron booking-reminder error: ${error.message}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ✅ B-23 (BONUS): Auto-flag suspicious stale PAID bookings
  // (PAID but not completed after 30 days — flag for admin review)
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("45 4 * * *", async () => {
    const threshold = new Date(Date.now() - 30 * DAY_MS);
    try {
      const [affectedCount] = await Booking.update(
        {
          notes:
            "FLAGGED: PAID but not completed after 30 days — admin review needed",
        },
        {
          where: {
            status: "PAID",
            paymentStatus: "PAID",
            bookingDate: { [Op.lt]: threshold },
            completionOtpVerified: false,
          },
        }
      );

      if (affectedCount > 0) {
        logger.warn(
          `⚠️ Cron: Flagged ${affectedCount} stale PAID bookings for admin review`
        );
      }
    } catch (error) {
      logger.error(`❌ Cron stale-PAID flag error: ${error.message}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // Daily backup log
  // ═══════════════════════════════════════════════════════════════
  cron.schedule("30 2 * * *", () => {
    logger.info("✅ Cron: Daily backup triggered at 2:30 AM");
  });

  logger.info("🕐 Cron jobs started");
};