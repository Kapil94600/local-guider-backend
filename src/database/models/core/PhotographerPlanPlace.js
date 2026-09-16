import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const PhotographerPlanPlace = sequelize.define(
  "PhotographerPlanPlace",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    photographerPlanId: { type: DataTypes.UUID, allowNull: false },
    placeId: { type: DataTypes.UUID, allowNull: false },
  },
  { tableName: "photographer_plan_places", timestamps: true }
);

export default PhotographerPlanPlace;