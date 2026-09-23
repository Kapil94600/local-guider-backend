import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    type: {
      type: DataTypes.ENUM("BOOKING", "PAYMENT", "SYSTEM", "OFFER", "ROLE_REQUEST", "CHAT", "WITHDRAWAL"),
      defaultValue: "SYSTEM",
    },
    data: { type: DataTypes.JSON, defaultValue: {} },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    readAt: { type: DataTypes.DATE, allowNull: true },
    // ✅ New fields
    channel: { type: DataTypes.ENUM("IN_APP", "EMAIL", "SMS", "PUSH"), defaultValue: "IN_APP" },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "notifications",
    timestamps: true,
    indexes: [
      { fields: ["userId", "isRead"] },
      { fields: ["type"] },
    ],
  }
);

export default Notification;