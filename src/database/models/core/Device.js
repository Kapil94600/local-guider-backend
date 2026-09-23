// src/database/models/core/Device.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Device = sequelize.define(
  "Device",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ✅ CRITICAL: userId was missing — now added
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    deviceName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    os: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    appVersion: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    // Expo push token / FCM token
    fcmToken: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    lastActiveAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "devices",
    timestamps: true,
    indexes: [
      {
        // ✅ One token per user — prevent duplicates
        unique: true,
        fields: ["userId", "fcmToken"],
        name: "devices_user_token_unique",
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["fcmToken"],
      },
    ],
  }
);

export default Device;