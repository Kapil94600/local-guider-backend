import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";
import { ROLE_VALUES } from "../../../constants/roles.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,   // ✅ Google/OTP users ke liye phone optional
      unique: true,
    },

    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true,    // ✅ allows OTP users
    },

    role: {
      type: DataTypes.ENUM(...ROLE_VALUES),
      defaultValue: "USER",
    },

    profileImage: {
      type: DataTypes.TEXT,
    },

    gender: {
      type: DataTypes.STRING(20),
    },

    dob: {
      type: DataTypes.DATEONLY,
    },

    country: {
      type: DataTypes.STRING,
    },

    state: {
      type: DataTypes.STRING,
    },

    city: {
      type: DataTypes.STRING,
    },

    language: {
      type: DataTypes.STRING,
      defaultValue: "en",
    },

    timezone: {
      type: DataTypes.STRING,
      defaultValue: "Asia/Kolkata",
    },

    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    emailVerifiedAt: {
      type: DataTypes.DATE,
    },

    phoneVerifiedAt: {
      type: DataTypes.DATE,
    },

    accountStatus: {
      type: DataTypes.ENUM(
        "PENDING",
        "ACTIVE",
        "SUSPENDED",
        "BLOCKED"
      ),
      defaultValue: "PENDING",
    },

    lastLoginAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "users",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        unique: true,
        fields: ["phone"],
      },
      {
        fields: ["role"],
      },
      {
        fields: ["accountStatus"],
      },
    ],
  }
);

export default User;