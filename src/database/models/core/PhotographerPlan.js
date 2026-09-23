// PhotographerPlan.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const PhotographerPlan = sequelize.define(
  "PhotographerPlan",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    photographerId: { type: DataTypes.UUID, allowNull: false },
    placeIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    photoCount: { type: DataTypes.INTEGER, defaultValue: 10 },
    duration: { type: DataTypes.INTEGER, defaultValue: 60 }, // ✅ in minutes
    price: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "photographer_plans", timestamps: true }
);

export default PhotographerPlan;