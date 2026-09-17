// src/utils/smsService.js
// ═══════════════════════════════════════════════════════════════
// 🔥 FIREBASE PHONE AUTH — Backend Stub
// ═══════════════════════════════════════════════════════════════
//
// OTP ab Firebase Phone Auth handle karta hai (mobile app me).
// Backend se SMS bhejne ki zaroorat nahi.
//
// Firebase free tier: 10,000 verifications/month
// Backend sirf Firebase ID token verify karta hai (/auth/firebase-login).
//
// Ye file sirf backward compatibility ke liye hai — jo purane modules
// (booking, notification) sendSms import karte hain, wo crash na ho.
// ═══════════════════════════════════════════════════════════════

/**
 * Deprecated: SMS ab Firebase Phone Auth handle karta hai.
 * Ye function kuch nahi bhejta — sirf warning log karta hai.
 *
 * @param {Object} params
 * @param {string} params.to   - Phone number
 * @param {string} params.body - Message body
 * @returns {Promise<Object>}  - { success: false, skipped: true }
 */
export const sendSms = async ({ to, body }) => {
  console.warn(
    `⚠️  sendSms called for ${to}, but SMS disabled. ` +
    `Use Firebase Phone Auth on the mobile app instead.`
  );
  return {
    success: false,
    skipped: true,
    provider: "Firebase",
    reason: "SMS providers disabled. Use Firebase Phone Auth in mobile app.",
  };
};

export default { sendSms };