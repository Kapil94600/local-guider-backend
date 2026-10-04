// src/modules/devices/device.routes.js
import express from "express";
import {
  registerToken,
  unregisterToken,
  getMyDevices,
} from "./device.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// All device routes require auth
router.use(authenticate);

// POST /api/v1/devices/register-token
router.post("/register-token", registerToken);

// POST /api/v1/devices/unregister-token
router.post("/unregister-token", unregisterToken);

// GET /api/v1/devices
router.get("/", getMyDevices);

export default router;