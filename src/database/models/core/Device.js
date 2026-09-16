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

    deviceName: DataTypes.STRING,

    deviceType: DataTypes.STRING,

    os: DataTypes.STRING,

    appVersion: DataTypes.STRING,

    fcmToken: DataTypes.TEXT,

    lastActiveAt: DataTypes.DATE,
  },
  {
    tableName: "devices",
    timestamps: true,
  }
);

export default Device;