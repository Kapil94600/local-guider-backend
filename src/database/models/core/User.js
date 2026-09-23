// src/database/models/core/User.js
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
      allowNull: true,
      unique: true,
    },

    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },

    provider: {
      type: DataTypes.ENUM("LOCAL", "GOOGLE", "OTP"),
      defaultValue: "LOCAL",
      allowNull: false,
    },

    resetTokenHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    resetTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
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
    "BLOCKED",
    "DELETED"     // ✅ NEW — for soft delete
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

    // ═══════════════════════════════════════════════════════════
    // ✅ NEW: defaultScope — globally exclude sensitive fields
    // ═══════════════════════════════════════════════════════════
    defaultScope: {
      attributes: {
        exclude: [
          "passwordHash",
          "resetTokenHash",
          "resetTokenExpires",
          "googleId",
        ],
      },
    },

    // ═══════════════════════════════════════════════════════════
    // ✅ NEW: withPassword scope — explicitly include for auth
    // ═══════════════════════════════════════════════════════════
    scopes: {
      withPassword: {
        attributes: {
          include: ["passwordHash"],
        },
      },
      withGoogleId: {
        attributes: {
          include: ["googleId"],
        },
      },
    },

    indexes: [
      { unique: true, fields: ["email"] },
      { unique: true, fields: ["phone"] },
      { unique: true, fields: ["googleId"] },
      { fields: ["role"] },
      { fields: ["accountStatus"] },
    ],
  }
);

export default User;