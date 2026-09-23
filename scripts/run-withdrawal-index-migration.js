// scripts/run-withdrawal-index-migration.js
import { sequelize } from "../src/config/database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(
  __dirname,
  "../src/database/migrations/003_add_pending_withdrawal_unique_index.sql"
);

const run = async () => {
  try {
    console.log("🚀 Connecting to Neon...");
    await sequelize.authenticate();
    console.log("✅ Neon connected\n");

    if (!fs.existsSync(MIGRATION_FILE)) {
      throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
    }

    const sql = fs.readFileSync(MIGRATION_FILE, "utf8");

    console.log("📄 Running migration...\n");
    console.log("─".repeat(50));

    const [results] = await sequelize.query(sql);

    console.log("─".repeat(50));
    console.log("\n✅ Migration completed!\n");

    // Show verification results
    if (Array.isArray(results)) {
      results.forEach((row) => {
        console.log("📌 Index:", row.indexname || "created");
        console.log("   Definition:", row.indexdef || "N/A");
      });
    }

    // Double check
    const [verify] = await sequelize.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'withdrawal_requests' 
        AND indexname = 'withdrawal_pending_per_user_unique';
    `);

    if (verify.length > 0) {
      console.log("\n✅ VERIFIED: Index 'withdrawal_pending_per_user_unique' exists!");
    } else {
      console.log("\n⚠️ WARNING: Index not found. Check logs.");
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
};

run();