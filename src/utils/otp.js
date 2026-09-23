// src/utils/otp.js
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: crypto.randomInt is cryptographically secure
// (Math.random is predictable)
// ═══════════════════════════════════════════════════════════════
export const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};