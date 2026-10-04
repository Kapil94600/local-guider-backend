// src/routes/index.js
import express from "express";
import deviceRoutes from "../modules/devices/device.routes.js";
// ... baaki imports

const router = express.Router();

// ... baaki routes

// ✅ Devices route register karo
router.use("/devices", deviceRoutes);

export default router;