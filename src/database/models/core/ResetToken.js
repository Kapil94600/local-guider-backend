import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const ResetToken = sequelize.define(
  "ResetToken",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    isUsed: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: "reset_tokens", timestamps: true }
);

export default ResetToken;