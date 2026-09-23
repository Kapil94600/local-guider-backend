import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Slider = sequelize.define(
  "Slider",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    linkType: {
      type: DataTypes.ENUM("PLACE", "GUIDER", "PHOTOGRAPHER", "URL", "NONE"),
      defaultValue: "NONE",
    },
    linkId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "sliders",
    timestamps: true,
  }
);

export default Slider;