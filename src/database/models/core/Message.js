// src/database/models/core/Message.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    messageType: {
      type: DataTypes.ENUM("TEXT", "IMAGE", "FILE", "LOCATION"),
      defaultValue: "TEXT",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // ✅ For images/files
    mediaUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // ✅ Read status
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "messages",
    timestamps: true,
    indexes: [
      {
        fields: ["conversationId"],
      },
      {
        fields: ["senderId"],
      },
    ],
  }
);

export default Message;