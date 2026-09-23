// GuiderPlan.js (unchanged)
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const GuiderPlan = sequelize.define(
  "GuiderPlan",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    guiderId: { type: DataTypes.UUID, allowNull: false },
    placeIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    duration: { type: DataTypes.INTEGER, defaultValue: 0 }, // ✅ already here
    price: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "guider_plans", timestamps: true }
);

export default GuiderPlan;