// src/database/migrations/003-add-role-request-details.js
// ═══════════════════════════════════════════════════════════════
// Add extra profile fields to role_requests
// ═══════════════════════════════════════════════════════════════
export default {
  async up(queryInterface) {
    const q = queryInterface.sequelize.query.bind(queryInterface.sequelize);

    // ✅ bio (dedicated — message already exists for backward compat)
    await q(`
      ALTER TABLE role_requests
      ADD COLUMN IF NOT EXISTS bio TEXT;
    `);

    // ✅ WhatsApp number
    await q(`
      ALTER TABLE role_requests
      ADD COLUMN IF NOT EXISTS "whatsappNumber" VARCHAR(20);
    `);

    // ✅ Alternate / second phone number
    await q(`
      ALTER TABLE role_requests
      ADD COLUMN IF NOT EXISTS "alternatePhone" VARCHAR(20);
    `);

    // ✅ Contact email (may differ from account email)
    await q(`
      ALTER TABLE role_requests
      ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);

    // ✅ Date of birth
    await q(`
      ALTER TABLE role_requests
      ADD COLUMN IF NOT EXISTS "dateOfBirth" DATEONLY;
    `);

    // ✅ Gender
    await q(`
      ALTER TABLE role_requests
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
    `);

    // ✅ Experience (years)
    await q(`
      ALTER TABLE role_requests
      ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;
    `);

    // ✅ Languages (JSONB array)
    await q(`
      ALTER TABLE role_requests
      ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb;
    `);

    console.log("✅ role_requests — extra profile fields added");
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize.query.bind(queryInterface.sequelize);
    await q(`ALTER TABLE role_requests DROP COLUMN IF EXISTS bio;`);
    await q(`ALTER TABLE role_requests DROP COLUMN IF EXISTS "whatsappNumber";`);
    await q(`ALTER TABLE role_requests DROP COLUMN IF EXISTS "alternatePhone";`);
    await q(`ALTER TABLE role_requests DROP COLUMN IF EXISTS email;`);
    await q(`ALTER TABLE role_requests DROP COLUMN IF EXISTS "dateOfBirth";`);
    await q(`ALTER TABLE role_requests DROP COLUMN IF EXISTS gender;`);
    await q(`ALTER TABLE role_requests DROP COLUMN IF EXISTS experience;`);
    await q(`ALTER TABLE role_requests DROP COLUMN IF EXISTS languages;`);
  },
};