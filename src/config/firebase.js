// src/config/firebase.js
import admin from "firebase-admin";
import fs from "fs";
import { env } from "./env.js";

// ═══════════════════════════════════════════
// Firebase Admin — service account
// ═══════════════════════════════════════════
// Priority:
//   1. FIREBASE_SERVICE_ACCOUNT (JSON string in env) — best for serverless
//   2. FIREBASE_* individual fields — good for traditional servers
//   3. FIREBASE_SERVICE_ACCOUNT_PATH (file path) — DEV ONLY, never commit the file
// ═══════════════════════════════════════════

const getServiceAccount = () => {
  // Option 1: JSON string in env (e.g., Render / Vercel / Heroku)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON");
      throw err;
    }
  }

  // Option 2: Individual env fields
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY) {
    return {
      type: "service_account",
      project_id: env.FIREBASE_PROJECT_ID,
      private_key_id: env.FIREBASE_PRIVATE_KEY_ID,
      private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: env.FIREBASE_CLIENT_EMAIL,
      client_id: env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: env.FIREBASE_CLIENT_CERT_URL,
      universe_domain: "googleapis.com",
    };
  }

  // Option 3: File path (DEV ONLY)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Firebase service account file not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  throw new Error(
    "Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT (JSON) OR FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL."
  );
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(getServiceAccount()),
    });
    console.log("✅ Firebase Admin configured");
  } catch (error) {
    console.error("❌ Firebase Admin not configured:", error.message);
    // Do NOT crash the app if Firebase fails — log and continue
    // (unless you want to enforce it)
  }
}

export default admin;