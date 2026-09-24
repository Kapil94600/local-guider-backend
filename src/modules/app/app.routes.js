// src/modules/app/app.routes.js
// ═══════════════════════════════════════════════════════════════
// APP INFO ROUTES — version check endpoints
// ═══════════════════════════════════════════════════════════════
import express from "express";
import { getLatestVersion } from "./app.controller.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// GET /app/version?platform=android|ios
// Public route — no auth required
// ═══════════════════════════════════════════════════════════════
router.get("/version", getLatestVersion);

export default router;