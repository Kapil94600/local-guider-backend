// src/database/migrate.js
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { sequelize } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

const ensureMigrationTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
};

const getAppliedMigrations = async () => {
  const [rows] = await sequelize.query(`SELECT name FROM _migrations`);
  return new Set(rows.map((r) => r.name));
};

const markApplied = async (name) => {
  await sequelize.query(`INSERT INTO _migrations (name) VALUES (:name)`, {
    replacements: { name },
  });
};

export const runMigrations = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected\n");

    await ensureMigrationTable();

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
      console.log("📁 Created migrations folder\n");
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".js"))
      .sort();

    if (files.length === 0) {
      console.log("ℹ️  No migrations found in src/database/migrations/");
      console.log("   Create one and run again.\n");
      process.exit(0);
    }

    const applied = await getAppliedMigrations();
    let count = 0;
    let skipped = 0;

    console.log("═══════════════════════════════════════");
    console.log("🔄 RUNNING MIGRATIONS");
    console.log("═══════════════════════════════════════\n");

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭️  Skipping (already applied): ${file}`);
        skipped++;
        continue;
      }

      console.log(`🔄 Running: ${file}`);

      try {
        const migrationPath = path.join(MIGRATIONS_DIR, file);
        const migrationUrl = pathToFileURL(migrationPath).href;

        const migrationModule = await import(migrationUrl);
        const migration = migrationModule.default || migrationModule;

        if (typeof migration.up !== "function") {
          throw new Error(`Migration ${file} has no 'up' function`);
        }

        await migration.up(sequelize.getQueryInterface(), sequelize);
        await markApplied(file);

        console.log(`✅ Applied: ${file}\n`);
        count++;
      } catch (err) {
        console.error(`❌ FAILED: ${file}`);
        console.error(`   Error: ${err.message}\n`);
        console.error(err.stack);
        process.exit(1);
      }
    }

    console.log("═══════════════════════════════════════");
    console.log(`🎉 Applied: ${count} | Skipped: ${skipped}`);
    console.log("═══════════════════════════════════════\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration runner error:", err.message);
    process.exit(1);
  }
};

// ✅ Only run if this file is executed directly
const isMain =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  runMigrations();
}