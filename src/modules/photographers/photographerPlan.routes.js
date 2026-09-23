// src/modules/photographers/photographerPlan.routes.js
import express from "express";
import {
  createPhotographerPlan,
  getPhotographerPlans,
  getPhotographerPlan,
  editPhotographerPlan,
  deletePhotographerPlan,
} from "./photographerPlan.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ═══════════════════════════════════════════
// ✅ FIX: All routes require authentication
// ═══════════════════════════════════════════
router.use(authenticate);

// Public-ish (any logged-in user can browse plans)
router.get("/", getPhotographerPlans);
router.get("/:id", getPhotographerPlan);

// Only PHOTOGRAPHER or ADMIN can create/update/delete
router.post("/", authorize("PHOTOGRAPHER", "ADMIN"), createPhotographerPlan);
router.put("/:id", authorize("PHOTOGRAPHER", "ADMIN"), editPhotographerPlan);
router.delete("/:id", authorize("PHOTOGRAPHER", "ADMIN"), deletePhotographerPlan);

export default router;