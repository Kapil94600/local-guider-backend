// src/database/models/core/WalletTransaction.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";
import { WALLET_TRANSACTION_VALUES } from "../../../constants/wallet.js";

const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walletId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    transactionType: {
      type: DataTypes.ENUM(...WALLET_TRANSACTION_VALUES),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(12, 2),
    },
    referenceId: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "wallet_transactions",
    timestamps: true,
  }
);

export default WalletTransaction;