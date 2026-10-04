// src/database/models/core/Booking.js
// ═══════════════════════════════════════════════════════════════
// BOOKING MODEL
// ═══════════════════════════════════════════════════════════════
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    placeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    guiderPlanId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    photographerPlanId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    bookingDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    // ✅ Status now includes PAID
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "APPROVED",
        "PAID",
        "REJECTED",
        "COMPLETED",
        "CANCELLED"
      ),
      defaultValue: "PENDING",
    },

    // ✅ Payment tracking fields
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

    notes: {
      type: DataTypes.TEXT,
    },

    // ✅ OTP flow
    completionOtp: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    completionOtpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completionOtpVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "bookings",
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// ASSOCIATIONS
// ✅ Alias names MUST match booking.repository.js includeOptions
// ═══════════════════════════════════════════════════════════════
Booking.associate = (models) => {
  // ─── Customer (User) ───
  // ⚠️ IMPORTANT: alias is "User" (capital U)
  //    booking.repository.js must use `as: "User"` to match
  Booking.belongsTo(models.User, {
    foreignKey: "userId",
    as: "User",
  });

  // ─── Place ───
  Booking.belongsTo(models.Place, {
    foreignKey: "placeId",
    as: "place",
  });

  // ─── Guider Plan ───
  Booking.belongsTo(models.GuiderPlan, {
    foreignKey: "guiderPlanId",
    as: "guiderPlan",
  });

  // ─── Photographer Plan ───
  Booking.belongsTo(models.PhotographerPlan, {
    foreignKey: "photographerPlanId",
    as: "photographerPlan",
  });

  // ─── Status History ───
  Booking.hasMany(models.BookingStatusHistory, {
    foreignKey: "bookingId",
    as: "statusHistory",
  });
};

export default Booking;