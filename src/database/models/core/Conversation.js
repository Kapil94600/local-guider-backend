// src/database/models/core/Conversation.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Conversation = sequelize.define(
  "Conversation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    participant1Id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    participant2Id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    lastMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    participant1Role: {
      type: DataTypes.STRING,
      defaultValue: "USER",
    },
    participant2Role: {
      type: DataTypes.STRING,
      defaultValue: "USER",
    },
    // ✅ Keep bookingId as metadata (latest booking context) — NOT part of uniqueness
    bookingId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "conversations",
    timestamps: true,
    indexes: [
      {
        // ✅ FIX: unique by participants only — one chat per user pair
        unique: true,
        fields: ["participant1Id", "participant2Id"],
        name: "unique_conversation_pair",
      },
      { fields: ["participant1Id"] },
      { fields: ["participant2Id"] },
    ],
  }
);

export default Conversation;