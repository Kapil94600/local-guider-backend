import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const GuiderPlanPlace = sequelize.define(
  "GuiderPlanPlace",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    guiderPlanId: { type: DataTypes.UUID, allowNull: false },
    placeId: { type: DataTypes.UUID, allowNull: false },
  },
  { tableName: "guider_plan_places", timestamps: true }
);

export default GuiderPlanPlace;