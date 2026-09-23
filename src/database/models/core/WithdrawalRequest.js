// src/database/models/core/WithdrawalRequest.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const WithdrawalRequest = sequelize.define(
  "WithdrawalRequest",
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
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    // ═══════════════════════════════════════════
    // Commission tracking fields
    // ═══════════════════════════════════════════
    commissionPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      allowNull: false,
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
    },
    netAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
    },
    // ═══════════════════════════════════════════
    // Bank details
    // ═══════════════════════════════════════════
    accountName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accountNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ifscCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    upiId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
      defaultValue: "PENDING",
    },
    adminMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ✅ NEW: Audit trail — which admin processed this
    processedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "withdrawal_requests",
    timestamps: true,
    indexes: [
      { fields: ["userId"] },
      { fields: ["status"] },
      { fields: ["processedById"] },
    ],
  }
);

export default WithdrawalRequest;