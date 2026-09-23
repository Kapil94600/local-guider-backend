// scripts/json-to-env.js
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: node scripts/json-to-env.js path/to/firebase-service-account.json");
  process.exit(1);
}

const jsonPath = args[0];
if (!fs.existsSync(jsonPath)) {
  console.error(`❌ File not found: ${jsonPath}`);
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  // Validate required fields
  const requiredFields = ["type", "project_id", "private_key", "client_email"];
  const missing = requiredFields.filter((f) => !serviceAccount[f]);
  if (missing.length > 0) {
    console.error("❌ Invalid service account JSON. Missing:", missing.join(", "));
    process.exit(1);
  }

  // Convert to single-line string
  const singleLine = JSON.stringify(serviceAccount);

  console.log("\n═══════════════════════════════════════");
  console.log("📋 FIREBASE SERVICE ACCOUNT (single-line)");
  console.log("═══════════════════════════════════════\n");
  console.log(`FIREBASE_SERVICE_ACCOUNT=${singleLine}`);
  console.log("\n═══════════════════════════════════════\n");

  // Also save to file for convenience
  const outputPath = path.join(process.cwd(), "firebase-env-line.txt");
  fs.writeFileSync(outputPath, `FIREBASE_SERVICE_ACCOUNT=${singleLine}`);
  console.log(`✅ Saved to: ${outputPath}\n`);
  console.log("👉 Copy the line above and paste into your .env file\n");
} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}