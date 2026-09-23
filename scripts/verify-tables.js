// scripts/verify-tables.js
import { sequelize } from "../src/config/database.js";

const REQUIRED_TABLES = [
  "users", "wallets", "wallet_transactions", "refresh_tokens",
  "reset_tokens", "devices", "places", "guiders", "photographers",
  "guider_plans", "photographer_plans", "bookings",
  "booking_status_history", "reviews", "favorites", "notifications",
  "role_requests", "sliders", "id_cards", "offers", "blocks",
  "conversations", "messages", "withdrawal_requests", "_migrations",
];

const verify = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected\n");
    console.log("═══════════════════════════════════════");
    console.log("🔍 VERIFYING TABLES");
    console.log("═══════════════════════════════════════\n");

    const [results] = await sequelize.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`);
    const existingTables = new Set(results.map((r) => r.tablename));

    let missing = 0, found = 0;
    console.log("📋 Required tables:\n");
    for (const table of REQUIRED_TABLES) {
      if (existingTables.has(table)) { console.log(`   ✅ ${table}`); found++; }
      else { console.log(`   ❌ ${table} — MISSING`); missing++; }
    }

    const extraTables = [...existingTables].filter((t) => !REQUIRED_TABLES.includes(t) && t !== "SequelizeMeta");
    if (extraTables.length > 0) {
      console.log("\n📋 Extra tables:\n");
      extraTables.forEach((t) => console.log(`   ⚪ ${t}`));
    }

    console.log("\n═══════════════════════════════════════");
    console.log(`✅ Found: ${found}/${REQUIRED_TABLES.length}`);
    console.log(`❌ Missing: ${missing}`);
    console.log("═══════════════════════════════════════\n");

    if (missing > 0) {
      console.log("⚠️  Some tables are missing!\n");
      process.exit(1);
    } else {
      console.log("🎉 All tables exist! Backend ready.\n");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }
};

verify();
