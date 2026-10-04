// src/database/models/core/RoleRequest.js
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

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    requestedRole: {
      type: DataTypes.ENUM("GUIDER", "PHOTOGRAPHER"),
      allowNull: false,
    },

    // ✅ Legacy "message" — kept for backward compat
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ✅ NEW: dedicated bio
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
      defaultValue: "PENDING",
      allowNull: false,
    },

    adminMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ═══════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════
    fullName: { type: DataTypes.STRING, allowNull: true },
    companyName: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },

    // ═══════════════════════════════════════════
    // ✅ NEW: Contact details
    // ═══════════════════════════════════════════
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isEmail: true },
    },
    whatsappNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    alternatePhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    // ═══════════════════════════════════════════
    // ✅ NEW: Personal details
    // ═══════════════════════════════════════════
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    // ═══════════════════════════════════════════
    // ✅ NEW: Professional details
    // ═══════════════════════════════════════════
    experience: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    languages: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    // ═══════════════════════════════════════════
    // Documents
    // ═══════════════════════════════════════════
    selfieUrl: { type: DataTypes.STRING, allowNull: true },
    idFrontUrl: { type: DataTypes.STRING, allowNull: true },
    idBackUrl: { type: DataTypes.STRING, allowNull: true },
    profilePhotoUrl: { type: DataTypes.STRING, allowNull: true },

    placeIds: {
      type: DataTypes.JSON,
      defaultValue: [],
    },

    idType: {
      type: DataTypes.ENUM(
        "AADHAAR",
        "PAN",
        "DRIVING_LICENSE",
        "VOTER_ID",
        "PASSPORT",
        "OTHER"
      ),
      allowNull: true,
      defaultValue: "AADHAAR",
    },
  },
  {
    tableName: "role_requests",
    timestamps: true,
  }
);

export default RoleRequest;