// src/utils/emailTemplates.js

// ═══════════════════════════════════════════════════════════════
// BASE TEMPLATE WRAPPER
// ═══════════════════════════════════════════════════════════════
const wrapTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1E3A6E,#0B1A30);padding:32px;text-align:center;">
              <h1 style="color:#FFD700;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Local Guider</h1>
              <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:13px;">${title}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;color:#1E293B;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;margin:0;font-size:12px;">© ${new Date().getFullYear()} Local Guider. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ═══════════════════════════════════════════════════════════════
// PASSWORD RESET
// ═══════════════════════════════════════════════════════════════
export const getEmailTemplate = (type, title, message, data = {}) => {
  if (type === "PASSWORD_RESET" && data.resetUrl) {
    return wrapTemplate(
      "Password Reset",
      `
      <p>Hello,</p>
      <p>${message || "You requested a password reset."}</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="${data.resetUrl}" style="background:linear-gradient(135deg,#1E3A6E,#0B1A30);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;display:inline-block;">Reset Password</a>
      </p>
      <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email. This link expires in 15 minutes.</p>
      `
    );
  }

  // Default template
  return wrapTemplate(
    title || "Notification",
    `
    <h2 style="color:#1E3A6E;margin:0 0 16px;font-size:20px;">${title}</h2>
    <p>${message}</p>
    `
  );
};

// ═══════════════════════════════════════════════════════════════
// BROADCAST EMAIL
// ═══════════════════════════════════════════════════════════════
export const getBroadcastEmailTemplate = (title, message) => {
  return wrapTemplate(
    title,
    `
    <h2 style="color:#1E3A6E;margin:0 0 16px;font-size:20px;">${title}</h2>
    <p style="white-space:pre-wrap;">${message}</p>
    `
  );
};

export default {
  getEmailTemplate,
  getBroadcastEmailTemplate,
};