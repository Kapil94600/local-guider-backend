// src/modules/app/app.controller.js
// ═══════════════════════════════════════════════════════════════
// APP INFO CONTROLLER
// ═══════════════════════════════════════════════════════════════
import { ApiResponse } from "../../utils/apiResponse.js";

// ═══════════════════════════════════════════════════════════════
// Version config — change without deploying new code
// ═══════════════════════════════════════════════════════════════
const VERSION_CONFIG = {
  android: {
    latestVersion: "1.0.0",
    minVersion: "1.0.0",
    releaseNotes:
      "Bug fixes and performance improvements. Better chat experience.",
    updateUrl:
      "https://play.google.com/store/apps/details?id=com.localguider.localguider",
  },
  ios: {
    latestVersion: "1.0.0",
    minVersion: "1.0.0",
    releaseNotes: "Bug fixes and performance improvements.",
    updateUrl: "https://apps.apple.com/app/id0000000000",
  },
};

// ═══════════════════════════════════════════════════════════════
// GET /app/version?platform=android|ios
// ═══════════════════════════════════════════════════════════════
export const getLatestVersion = async (req, res, next) => {
  try {
    const platform = (req.query.platform || "android")
      .toString()
      .toLowerCase();

    const config =
      VERSION_CONFIG[platform] || VERSION_CONFIG.android;

    return ApiResponse.success(res, "Version info fetched", {
      platform,
      ...config,
      // ✅ Force update = app must update
      // (client checks: currentVersion < minVersion)
      forceUpdate: false,
    });
  } catch (error) {
    next(error);
  }
};