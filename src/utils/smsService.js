// src/utils/smsService.js
import axios from "axios";
import { env } from "../config/env.js";

// ✅ Fast2SMS - Quick SMS (No DLT Required!)
const sendViaFast2SMS = async (to, otp) => {
  const numbers = to.replace("+", "").trim(); // e.g., 919460097816
  const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
    params: {
      route: "q", // Quick SMS route - no DLT needed
      sender_id: env.FAST2SMS_SENDER_ID || "FSTSMS",
      message: `Your OTP is ${otp}. Please do not share it with anyone.`,
      language: "english",
      flash: 0,
      numbers,
    },
    headers: {
      authorization: env.FAST2SMS_API_KEY,
    },
  });
  return response.data;
};

// ✅ MSG91 fallback (agar Fast2SMS fail ho)
const sendViaMsg91 = async (to, otp) => {
  const phone = to.replace("+", "");
  const response = await axios.post(
    "https://control.msg91.com/api/v5/flow/",
    {
      flow_id: env.MSG91_TEMPLATE_ID,
      sender: env.MSG91_SENDER_ID || "LOCGUDR",
      mobiles: phone,
      OTP: otp,
    },
    {
      headers: {
        authkey: env.MSG91_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const sendSms = async ({ to, body }) => {
  const otpMatch = body.match(/\d{6}/);
  const otp = otpMatch ? otpMatch[0] : null;

  // 1️⃣ Fast2SMS try karo (BEST - No DLT Required!)
  if (env.FAST2SMS_API_KEY && otp) {
    try {
      const result = await sendViaFast2SMS(to, otp);
      console.log("📤 Fast2SMS response:", JSON.stringify(result));
      if (result?.return === true || result?.status === "success") {
        console.log("✅ Fast2SMS SMS sent to", to);
        return { success: true, provider: "Fast2SMS" };
      }
    } catch (error) {
      console.log("⚠️ Fast2SMS failed:", error.response?.data?.message || error.message);
    }
  }

  // 2️⃣ MSG91 try karo (Fallback)
  if (env.MSG91_API_KEY && env.MSG91_TEMPLATE_ID && otp) {
    try {
      const result = await sendViaMsg91(to, otp);
      console.log("📤 MSG91 response:", JSON.stringify(result));
      if (result?.type === "success") {
        console.log("✅ MSG91 SMS sent to", to);
        return { success: true, provider: "MSG91" };
      }
    } catch (error) {
      console.log("⚠️ MSG91 failed:", error.message);
    }
  }

  // 3️⃣ Final fallback: OTP console me print
  console.log("📱 OTP (fallback):", otp || body, "to", to);
  return { success: false, skipped: true };
};