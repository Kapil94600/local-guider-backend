import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Block = sequelize.define(
  "Block",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },            // block करने वाला
    blockedUserId: { type: DataTypes.UUID, allowNull: false },     // जिसे block किया
    reason: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "blocks", timestamps: true }
);

export default Block;