import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Review = sequelize.define(
  "Review",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    guiderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    photographerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    isActive: {              // ✅ Added for admin toggle
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "reviews",
    timestamps: true,
  }
);

export default Review;