// src/config/cloudinary.js
// ═══════════════════════════════════════════════════════════════
// CLOUDINARY CONFIG — single source of truth
// ═══════════════════════════════════════════════════════════════
import { v2 as cloudinary } from "cloudinary";

// ─────────────────────────────────────────────────────────────
// CONFIG (runs once when this module is first imported)
// ─────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ─────────────────────────────────────────────────────────────
// STARTUP VERIFICATION
// Logs a clear message so you can spot missing env vars in
// Render logs immediately after deploy.
// ─────────────────────────────────────────────────────────────
const missing = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
].filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    "❌ Cloudinary env vars missing: " + missing.join(", ") +
    " — uploads will fail with 500 until these are set on Render."
  );
} else {
  console.log(
    "✅ Cloudinary configured for:",
    process.env.CLOUDINARY_CLOUD_NAME
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT — DEFAULT is critical.
// `cloudinaryUpload.js` does: import cloudinary from "../config/cloudinary.js"
// so this MUST be a default export, not a named one.
// ─────────────────────────────────────────────────────────────
export default cloudinary;