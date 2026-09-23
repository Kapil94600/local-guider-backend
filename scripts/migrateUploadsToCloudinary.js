// scripts/migrateUploadsToCloudinary.js
import fs from "fs";
import path from "path";
import { uploadToCloudinary } from "../src/utils/cloudinaryUpload.js";
import { sequelize } from "../src/config/database.js";
import { User, Place, Guider, Photographer } from "../src/database/models/index.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// ═══════════════════════════════════════════
// STEP 1 — Upload all files to Cloudinary
// ═══════════════════════════════════════════
async function uploadAllFiles() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    throw new Error(`uploads/ folder not found: ${UPLOADS_DIR}`);
  }

  const files = fs
    .readdirSync(UPLOADS_DIR)
    .filter((f) => fs.statSync(path.join(UPLOADS_DIR, f)).isFile());

  console.log(`📁 Found ${files.length} files in uploads/\n`);

  const mapping = {};
  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const buffer = fs.readFileSync(path.join(UPLOADS_DIR, file));
      const cloudUrl = await uploadToCloudinary(buffer, "local-guider/migrated");

      mapping[`/uploads/${file}`] = cloudUrl;
      mapping[`uploads/${file}`] = cloudUrl;
      mapping[file] = cloudUrl;

      uploaded++;
      console.log(`✅ [${uploaded}/${files.length}] ${file}`);
    } catch (err) {
      failed++;
      console.error(`❌ [${uploaded + failed}/${files.length}] ${file} → ${err.message}`);
    }
  }

  console.log(`\n✅ Uploaded: ${uploaded}, Failed: ${failed}\n`);

  const mapPath = path.join(process.cwd(), "uploads-migration-map.json");
  fs.writeFileSync(mapPath, JSON.stringify(mapping, null, 2));
  console.log(`📝 Mapping saved: ${mapPath}\n`);

  return mapping;
}

// ═══════════════════════════════════════════
// STEP 2 — URL replacement helper
// ═══════════════════════════════════════════
function replaceValue(value, mapping) {
  if (typeof value === "string") {
    if (value.startsWith("http")) return { changed: false, value };
    const newVal = mapping[value];
    return { changed: !!newVal, value: newVal || value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const newArr = value.map((item) => {
      if (typeof item === "string" && !item.startsWith("http")) {
        const newVal = mapping[item];
        if (newVal) {
          changed = true;
          return newVal;
        }
      }
      return item;
    });
    return { changed, value: newArr };
  }
  return { changed: false, value };
}

// ═══════════════════════════════════════════
// STEP 3 — Auto-detect & update every field
// ═══════════════════════════════════════════
async function migrateModel(Model, label, mapping) {
  const records = await Model.findAll();
  let updated = 0;

  for (const record of records) {
    const data = record.dataValues || {};
    const updates = {};

    for (const key of Object.keys(data)) {
      if (["id", "createdAt", "updatedAt", "deletedAt"].includes(key)) continue;

      const val = data[key];
      if (val === null || val === undefined) continue;

      const { changed, value } = replaceValue(val, mapping);
      if (changed) updates[key] = value;
    }

    if (Object.keys(updates).length > 0) {
      await record.update(updates);
      updated++;
    }
  }

  console.log(`${label}: ${updated} record(s) updated`);
  return updated;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
async function migrate() {
  console.log("🚀 Migration started...\n");

  await sequelize.authenticate();
  console.log("✅ DB connected\n");

  const mapping = await uploadAllFiles();

  console.log("💾 Updating database...\n");

  let total = 0;
  total += await migrateModel(User, "👤 Users", mapping);
  total += await migrateModel(Place, "📍 Places", mapping);
  total += await migrateModel(Guider, "🧭 Guiders", mapping);
  total += await migrateModel(Photographer, "📷 Photographers", mapping);

  console.log(`\n═══════════════════════════════════`);
  console.log(`✅ TOTAL RECORDS UPDATED: ${total}`);
  console.log(`═══════════════════════════════════`);
  console.log("🎉 Migration complete!\n");

  process.exit(0);
}

migrate().catch((err) => {
  console.error("\n❌ Migration FAILED:", err);
  process.exit(1);
});