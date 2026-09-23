"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // ✅ Add DELETED to accountStatus enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_accountStatus" ADD VALUE IF NOT EXISTS 'DELETED';`
    );

    // ✅ Create booking_status_history table
    await queryInterface.createTable("booking_status_history", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "bookings",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      changed_by_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      changed_by_role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "SYSTEM",
      },
      from_status: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      to_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // ✅ Indexes
    await queryInterface.addIndex("booking_status_history", ["booking_id"]);
    await queryInterface.addIndex("booking_status_history", ["createdAt"]);
    await queryInterface.addIndex("booking_status_history", ["to_status"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("booking_status_history");
    // ✅ PostgreSQL doesn't allow removing enum value easily — leave it
  },
};