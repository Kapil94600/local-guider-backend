// src/database/models/core/Booking.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Booking = sequelize.define(
  "Booking",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    placeId: { type: DataTypes.UUID, allowNull: true },
    guiderPlanId: { type: DataTypes.UUID, allowNull: true },
    photographerPlanId: { type: DataTypes.UUID, allowNull: true },
    bookingDate: { type: DataTypes.DATE, allowNull: false },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    // ✅ Status now includes PAID
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "APPROVED",
        "PAID",        // ✅ NEW
        "REJECTED",
        "COMPLETED",
        "CANCELLED"
      ),
      defaultValue: "PENDING",
    },

    // ✅ NEW: Payment tracking fields
    paymentStatus: {
      type: DataTypes.ENUM("PENDING", "PAID", "REFUNDED"),
      defaultValue: "PENDING",
    },
    paymentMethod: {
      type: DataTypes.ENUM("WALLET", "RAZORPAY", "CASH"),
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    notes: { type: DataTypes.TEXT },

    completionOtp: { type: DataTypes.STRING(6), allowNull: true },
    completionOtpExpiresAt: { type: DataTypes.DATE, allowNull: true },
    completionOtpVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: "bookings", timestamps: true }
);

export default Booking;