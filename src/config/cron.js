// src/config/cron.js
import cron from "node-cron";
import Booking from "../database/models/core/Booking.js";
import { Op } from "sequelize";
import { logger } from "../utils/logger.js";

export const startCronJobs = () => {
  // Auto-cancel Pending bookings after 24 hours
  cron.schedule("0 */6 * * *", async () => {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      const count = await Booking.update(
        { status: "CANCELLED", notes: "Auto-cancelled due to timeout" },
        { where: { status: "PENDING", createdAt: { [Op.lt]: threshold } } }
      );
      logger.info(`✅ Cron: Auto-cancelled ${count[0]} stale bookings`);
    } catch (error) {
      logger.error(`❌ Cron error: ${error.message}`);
    }
  });

  // Daily backup log
  cron.schedule("30 2 * * *", () => {
    logger.info("✅ Cron: Daily backup triggered at 2:30 AM");
  });
};