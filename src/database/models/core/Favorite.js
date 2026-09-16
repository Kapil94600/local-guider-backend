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
      type: DataTypes.ENUM(
        "PLACE",
        "GUIDER",
        "PHOTOGRAPHER"
      ),
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
  }
);

export default Favorite;