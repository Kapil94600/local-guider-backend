// src/database/models/core/Favorite.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Favorite = sequelize.define(
  "Favorite",
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
    type: {
      type: DataTypes.ENUM("PLACE", "GUIDER", "PHOTOGRAPHER"),
      allowNull: false,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: "favorites",
    timestamps: true,
    indexes: [
      // ✅ Unique constraint (userId + type + referenceId)
      {
        unique: true,
        fields: ["userId", "type", "referenceId"],
        name: "favorites_unique_user_type_ref",
      },
      // Lookup indexes
      { fields: ["userId"] },
      { fields: ["type", "referenceId"] },
    ],
  }
);

export default Favorite;