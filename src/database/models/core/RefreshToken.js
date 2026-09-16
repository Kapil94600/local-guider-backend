import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ✅ New field – user owner
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    deviceId: {
      type: DataTypes.UUID,
    },

    ipAddress: {
      type: DataTypes.STRING,
    },

    userAgent: {
      type: DataTypes.TEXT,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    isRevoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "refresh_tokens",
    timestamps: true,
  }
);

export default RefreshToken;