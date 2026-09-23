import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Guider = sequelize.define(
  "Guider",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
    placeId: { type: DataTypes.UUID, allowNull: true },
    experience: { type: DataTypes.INTEGER, defaultValue: 0 },
    languages: { type: DataTypes.JSON, defaultValue: [] },
    bio: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

    fullName: { type: DataTypes.STRING, allowNull: true },
    companyName: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    selfieUrl: { type: DataTypes.STRING, allowNull: true },
    idFrontUrl: { type: DataTypes.STRING, allowNull: true },
    idBackUrl: { type: DataTypes.STRING, allowNull: true },
    profilePhotoUrl: { type: DataTypes.STRING, allowNull: true },
    placeIds: { type: DataTypes.JSONB, defaultValue: [] },

    // ✅ Gallery
    gallery: { type: DataTypes.JSONB, defaultValue: [] },
  },
  { tableName: "guiders", timestamps: true }
);

export default Guider;