// src/modules/guiders/guiderPlan.routes.js
import express from "express";
import {
  createGuiderPlan,
  getGuiderPlans,
  getGuiderPlan,
  editGuiderPlan,
  deleteGuiderPlan,
} from "./guiderPlan.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ═══════════════════════════════════════════
// ✅ FIX: All routes require authentication
// ═══════════════════════════════════════════
router.use(authenticate);

// Public-ish (any logged-in user can browse plans)
router.get("/", getGuiderPlans);
router.get("/:id", getGuiderPlan);

// Only GUIDER or ADMIN can create/update/delete
router.post("/", authorize("GUIDER", "ADMIN"), createGuiderPlan);
router.put("/:id", authorize("GUIDER", "ADMIN"), editGuiderPlan);
router.delete("/:id", authorize("GUIDER", "ADMIN"), deleteGuiderPlan);

export default router;