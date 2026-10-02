// src/database/models/core/Place.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Place = sequelize.define(
  "Place",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    category: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
      index: true,
    },
    // ✅ NEW: district column
    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
      index: true,
    },
    state: {
      type: DataTypes.STRING,
      index: true,
    },
    country: {
      type: DataTypes.STRING,
      defaultValue: "India",
    },
    latitude: {
      type: DataTypes.DOUBLE,
    },
    longitude: {
      type: DataTypes.DOUBLE,
    },
    image: {
      type: DataTypes.STRING,
    },
    gallery: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    openingTime: {
      type: DataTypes.STRING,
    },
    closingTime: {
      type: DataTypes.STRING,
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "places",
    timestamps: true,
    indexes: [
      { fields: ["city"] },
      { fields: ["district"] },
      { fields: ["state"] },
      { fields: ["isActive"] },
      { fields: ["latitude", "longitude"] },
    ],
  }
);

export default Place;