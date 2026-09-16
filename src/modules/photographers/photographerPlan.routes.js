import express from "express";
import {
  createPhotographerPlan,
  getPhotographerPlans,
  getPhotographerPlan,
  editPhotographerPlan,
  deletePhotographerPlan,
} from "./photographerPlan.controller.js";

const router = express.Router();

router.post("/", createPhotographerPlan);
router.get("/", getPhotographerPlans);
router.get("/:id", getPhotographerPlan);
router.put("/:id", editPhotographerPlan);
router.delete("/:id", deletePhotographerPlan);

export default router; // ✅ Ensure default export