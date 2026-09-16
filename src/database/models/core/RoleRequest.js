import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const RoleRequest = sequelize.define(
  "RoleRequest",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    requestedRole: {
      type: DataTypes.ENUM("GUIDER", "PHOTOGRAPHER"),
      allowNull: false,
    },
    message: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
      defaultValue: "PENDING",
      allowNull: false,
    },
    adminMessage: { type: DataTypes.TEXT, allowNull: true },

    // ✅ NEW FIELDS
    fullName: { type: DataTypes.STRING, allowNull: true },
    companyName: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    selfieUrl: { type: DataTypes.STRING, allowNull: true },
    idFrontUrl: { type: DataTypes.STRING, allowNull: true },
    idBackUrl: { type: DataTypes.STRING, allowNull: true },
    profilePhotoUrl: { type: DataTypes.STRING, allowNull: true },
    placeIds: { type: DataTypes.JSON, defaultValue: [] }, // max 3 place UUIDs
  },
  { tableName: "role_requests", timestamps: true }
);

export default RoleRequest;