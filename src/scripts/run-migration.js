// scripts/run-migration.js
import { sequelize } from "../src/config/database.js";

const migrate = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected\n");

    // ═══════════════════════════════════════════════════════════
    // 1. Add DELETED to accountStatus enum
    // ═══════════════════════════════════════════════════════════
    console.log("1️⃣ Adding DELETED to accountStatus enum...");
    await sequelize.query(
      `ALTER TYPE "enum_users_accountStatus" ADD VALUE IF NOT EXISTS 'DELETED';`
    );
    console.log("   ✅ DELETED added to enum\n");

    // ═══════════════════════════════════════════════════════════
    // 2. Create booking_status_history table
    // ═══════════════════════════════════════════════════════════
    console.log("2️⃣ Creating booking_status_history table...");
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS booking_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL,
        changed_by_id UUID,
        changed_by_role VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
        from_status VARCHAR(20),
        to_status VARCHAR(20) NOT NULL,
        note TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_booking_status_history_booking
          FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      );
    `);
    console.log("   ✅ Table created\n");

    // ═══════════════════════════════════════════════════════════
    // 3. Create indexes
    // ═══════════════════════════════════════════════════════════
    console.log("3️⃣ Creating indexes...");
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bsh_booking_id ON booking_status_history(booking_id);`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bsh_created_at ON booking_status_history("createdAt");`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bsh_to_status ON booking_status_history(to_status);`
    );
    console.log("   ✅ Indexes created\n");

    // ═══════════════════════════════════════════════════════════
    // 4. Verify
    // ═══════════════════════════════════════════════════════════
    console.log("═══════════════════════════════════════");
    console.log("🔍 VERIFICATION");
    console.log("═══════════════════════════════════════\n");

    const [enumResult] = await sequelize.query(
      `SELECT enum_range(NULL::"enum_users_accountStatus") AS values;`
    );
    console.log("📋 Enum values:");
    console.log("   " + enumResult[0].values + "\n");

    const [tables] = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE tablename = 'booking_status_history';`
    );
    console.log(
      "📋 Table 'booking_status_history': " +
        (tables.length > 0 ? "✅ EXISTS" : "❌ MISSING")
    );

    const [indexes] = await sequelize.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'booking_status_history'
      ORDER BY indexname;
    `);
    console.log("\n📋 Indexes:");
    indexes.forEach((idx) => console.log("   - " + idx.indexname));

    console.log("\n═══════════════════════════════════════");
    console.log("🎉 MIGRATION COMPLETE!");
    console.log("═══════════════════════════════════════\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ MIGRATION FAILED:");
    console.error("   " + error.message);
    console.error("\nFull error:");
    console.error(error);
    process.exit(1);
  }
};

migrate();