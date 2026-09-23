// src/database/migrations/001-add-deleted-to-accountstatus.js
export default {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_accountStatus" ADD VALUE IF NOT EXISTS 'DELETED';`
    );
  },

  async down(queryInterface) {
    // PostgreSQL doesn't support removing enum values easily
    console.log("⚠️ Cannot rollback enum value removal");
  },
};