// src/database/migrations/20261004-alter-devices-fcmtoken-to-text.js
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ✅ Change fcmToken column to TEXT (no length limit)
    await queryInterface.changeColumn("devices", "fcmToken", {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    // ✅ Delete truncated tokens (length < 50)
    await queryInterface.sequelize.query(
      `DELETE FROM devices WHERE LENGTH("fcmToken") < 50;`
    );

    console.log("✅ [Migration] fcmToken changed to TEXT, truncated tokens deleted");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("devices", "fcmToken", {
      type: Sequelize.STRING(50),
      allowNull: false,
    });
  },
};