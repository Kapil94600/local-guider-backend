// src/utils/smsService.js
// ═══════════════════════════════════════════════════════════════
// SMS Service — Firebase Phone Auth replacement
// ═══════════════════════════════════════════════════════════════
//
// OTP ab Firebase Phone Auth handle karta hai (mobile app me).
// Backend se SMS bhejne ki zaroorat nahi.
//
// Firebase free tier: 10,000 verifications/month
// Backend sirf Firebase ID token verify karta hai (/auth/firebase-login).
//
// Ye file backward compatibility ke liye rakhi gayi hai — jo purane
// modules (booking, notification) sendSms import karte hain, wo crash
// na ho.
// ═══════════════════════════════════════════════════════════════

/**
 * SMS sending — DISABLED (Firebase Phone Auth handles OTP)
 *
 * @deprecated SMS providers are disabled. Use Firebase Phone Auth in the mobile app.
 * @param {Object} params
 * @param {string} params.to   - Phone number (E.164 format)
 * @param {string} params.body - Message body
 * @returns {Promise<Object>}  - { success: false, skipped: true }
 */
export const sendSms = async ({ to, body }) => {
  // Silent skip — no log spam in production
  // Uncomment for debugging:
  // console.log(`ℹ️ SMS skipped (Firebase Phone Auth active): ${to}`);
  return {
    success: false,
    skipped: true,
    provider: "Firebase",
    reason: "SMS disabled. Use Firebase Phone Auth in mobile app.",
  };
};

export default { sendSms };