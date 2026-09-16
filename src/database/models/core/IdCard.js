import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const IdCard = sequelize.define(
  "IdCard",
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
    role: {
      type: DataTypes.ENUM("GUIDER", "PHOTOGRAPHER"),
      allowNull: false,
    },
    cardNumber: {
      type: DataTypes.STRING(50),
      unique: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    placeIds: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    // ✅ New field: Store place names directly
    placeNames: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    profileImage: {
      type: DataTypes.TEXT,
    },
    qrData: {
      type: DataTypes.TEXT,
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "EXPIRED", "REVOKED"),
      defaultValue: "ACTIVE",
    },
  },
  {
    tableName: "id_cards",
    timestamps: true,
  }
);

export default IdCard;