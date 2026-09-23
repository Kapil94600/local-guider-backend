// src/database/models/core/BookingStatusHistory.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

// ═══════════════════════════════════════════════════════════════
// BOOKING STATUS HISTORY — full audit trail
// ═══════════════════════════════════════════════════════════════
const BookingStatusHistory = sequelize.define(
  "BookingStatusHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "booking_id",
    },

    // ✅ Who changed the status
    changedById: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "changed_by_id",
    },

    // ✅ Role of the person who changed it
    changedByRole: {
      type: DataTypes.ENUM("CUSTOMER", "PROVIDER", "ADMIN", "SYSTEM"),
      allowNull: false,
      defaultValue: "SYSTEM",
      field: "changed_by_role",
    },

    // ✅ Status transition
    fromStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "from_status",
    },
    toStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "to_status",
    },

    // ✅ Reason/note
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ✅ Extra metadata (JSON)
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    tableName: "booking_status_history",
    timestamps: true,
    updatedAt: false, // ✅ History is immutable — no updates
    indexes: [
      { fields: ["booking_id"] },
      { fields: ["createdAt"] },
      { fields: ["to_status"] },
    ],
  }
);

export default BookingStatusHistory;