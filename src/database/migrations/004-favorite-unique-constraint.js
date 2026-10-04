// src/database/migrations/004-favorite-unique-constraint.js
// ═══════════════════════════════════════════════════════════════
// Add unique constraint on favorites (userId, type, referenceId)
// + cleanup existing duplicates
// ═══════════════════════════════════════════════════════════════
export default {
  async up(queryInterface) {
    const q = queryInterface.sequelize.query.bind(queryInterface.sequelize);

    // ─────────────────────────────────────────────────────────
    // 1. Delete existing duplicates (keep earliest createdAt)
    // ─────────────────────────────────────────────────────────
    await q(`
      DELETE FROM favorites
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY "userId", type, "referenceId"
              ORDER BY "createdAt" ASC
            ) AS rn
          FROM favorites
        ) t
        WHERE t.rn > 1
      );
    `);

    // ─────────────────────────────────────────────────────────
    // 2. Add unique constraint
    // ─────────────────────────────────────────────────────────
    await q(`
      ALTER TABLE favorites
      ADD CONSTRAINT favorites_unique_user_type_ref
      UNIQUE ("userId", type, "referenceId");
    `);

    console.log("✅ favorites — unique constraint added + duplicates cleaned");
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize.query.bind(queryInterface.sequelize);
    await q(`
      ALTER TABLE favorites
      DROP CONSTRAINT IF EXISTS favorites_unique_user_type_ref;
    `);
  },
};