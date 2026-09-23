// src/utils/emailService.js
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// ═══════════════════════════════════════════════════════════════
// SMTP TRANSPORTER (singleton)
// ═══════════════════════════════════════════════════════════════
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT, 10) || 587,
  secure: false, // true for 465, false for others
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  pool: true, // ✅ Connection pool
  maxConnections: 5,
  maxMessages: 100,
});

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: sendEmail THROWS on error (no silent swallow)
// ═══════════════════════════════════════════════════════════════
export const sendEmail = async ({ to, subject, html, text = null }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const fromAddress = `"${env.FROM_NAME || "Local Guider"}" <${
    env.FROM_EMAIL || env.SMTP_USER
  }>`;

  // ✅ Let it throw if it fails
  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
  });

  logger.info(`📧 Email sent: ${info.messageId} → ${to}`);
  return { success: true, messageId: info.messageId };
};

// ═══════════════════════════════════════════════════════════════
// VERIFY TRANSPORTER (startup check)
// ═══════════════════════════════════════════════════════════════
export const verifyEmailTransport = async () => {
  try {
    await transporter.verify();
    logger.info("✅ Email transport verified");
    return true;
  } catch (error) {
    logger.error(`❌ Email transport NOT verified: ${error.message}`);
    return false;
  }
};

export default { sendEmail, verifyEmailTransport };