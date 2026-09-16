// src/modules/admin/adminNotification.routes.js
import express from "express";
import { sendBroadcast, getAllNotifications } from "./adminNotification.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ✅ Admin only
router.use(authenticate, authorize("ADMIN"));

router.get("/", getAllNotifications);
router.post("/send", sendBroadcast);

export default router;