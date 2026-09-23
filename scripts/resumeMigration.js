// scripts/resumeMigration.js (v2 - handles full URLs)
import fs from "fs";
import path from "path";
import { uploadToCloudinary } from "../src/utils/cloudinaryUpload.js";
import { sequelize } from "../src/config/database.js";
import { User, Place, Guider, Photographer } from "../src/database/models/index.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAP_PATH = path.join(process.cwd(), "uploads-migration-map.json");

async function resumeUploads() {
  let mapping = {};
  if (fs.existsSync(MAP_PATH)) {
    mapping = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"));
    console.log("Loaded mapping entries:", Object.keys(mapping).length);
  }

  const allFiles = fs.readdirSync(UPLOADS_DIR)
    .filter((f) => fs.statSync(path.join(UPLOADS_DIR, f)).isFile());

  const pending = allFiles.filter((f) => !mapping["/uploads/" + f]);
  console.log("Total:", allFiles.length, "| Pending:", pending.length, "\n");

  if (pending.length === 0) {
    console.log("All files already uploaded!\n");
    return mapping;
  }

  let uploaded = 0, failed = 0;
  for (const file of pending) {
    try {
      const buffer = fs.readFileSync(path.join(UPLOADS_DIR, file));
      const cloudUrl = await uploadToCloudinary(buffer, "local-guider/migrated");
      mapping["/uploads/" + file] = cloudUrl;
      mapping["uploads/" + file] = cloudUrl;
      mapping[file] = cloudUrl;
      fs.writeFileSync(MAP_PATH, JSON.stringify(mapping, null, 2));
      uploaded++;
      console.log("OK [" + uploaded + "/" + pending.length + "] " + file);
    } catch (err) {
      failed++;
      console.error("FAIL " + file + " -> " + err.message);
    }
  }
  console.log("\nUploaded:", uploaded, "Failed:", failed, "\n");
  return mapping;
}

// ✅ HELPER: Extract filename from any URL containing /uploads/
function extractFilename(url) {
  if (typeof url !== "string") return null;
  const match = url.match(/\/uploads\/([^\/\?#]+)/);
  return match ? match[1] : null;
}

// ✅ FIXED: Handle both relative AND full URLs with /uploads/
function replaceValue(value, mapping) {
  if (typeof value === "string") {
    // Already a Cloudinary URL
    if (value.includes("res.cloudinary.com")) return { changed: false, value };

    // Extract filename if URL contains /uploads/
    const filename = extractFilename(value);
    if (filename && mapping["/uploads/" + filename]) {
      return { changed: true, value: mapping["/uploads/" + filename] };
    }

    // Direct relative path check
    const newVal = mapping[value];
    if (newVal) return { changed: true, value: newVal };

    return { changed: false, value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const newArr = value.map((item) => {
      if (typeof item === "string") {
        if (item.includes("res.cloudinary.com")) return item;

        const filename = extractFilename(item);
        if (filename && mapping["/uploads/" + filename]) {
          changed = true;
          return mapping["/uploads/" + filename];
        }

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

async function migrateModel(Model, label, mapping) {
  const records = await Model.findAll();
  let updated = 0;
  let details = [];

  for (const record of records) {
    const data = record.dataValues || {};
    const updates = {};
    const changedFields = [];

    for (const key of Object.keys(data)) {
      if (["id", "createdAt", "updatedAt", "deletedAt"].includes(key)) continue;
      const val = data[key];
      if (val === null || val === undefined) continue;

      const { changed, value } = replaceValue(val, mapping);
      if (changed) {
        updates[key] = value;
        changedFields.push(key);
      }
    }

    if (Object.keys(updates).length > 0) {
      await record.update(updates);
      updated++;
      details.push("  " + record.id + ": " + changedFields.join(", "));
    }
  }

  console.log("\n" + label + ": " + updated + " record(s) updated");
  details.forEach((d) => console.log(d));
  return updated;
}

async function main() {
  console.log("Resume Migration v2 started...\n");
  const mapping = await resumeUploads();

  console.log("Connecting to DB...");
  await sequelize.authenticate();
  console.log("DB connected\n");

  // Debug: sample DB values
  console.log("Checking sample DB records...\n");
  const sampleUsers = await User.findAll({ limit: 3 });
  for (const u of sampleUsers) {
    console.log("User", u.id, "profileImage:", u.profileImage);
  }

  const samplePlaces = await Place.findAll({ limit: 3 });
  for (const p of samplePlaces) {
    console.log("Place", p.id, "image:", p.image, "gallery:", JSON.stringify(p.gallery)?.slice(0, 200));
  }

  console.log("\nUpdating database...\n");
  let total = 0;
  total += await migrateModel(User, "Users", mapping);
  total += await migrateModel(Place, "Places", mapping);
  total += await migrateModel(Guider, "Guiders", mapping);
  total += await migrateModel(Photographer, "Photographers", mapping);

  console.log("\n===================================");
  console.log("TOTAL RECORDS UPDATED:", total);
  console.log("===================================");
  console.log("Migration complete!\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
