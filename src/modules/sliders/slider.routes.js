import express from "express";
import {
  getAllSliders,
  getActiveSliders,
  getSlider,
  createSlider,
  updateSlider,
  deleteSlider,
} from "./slider.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// ✅ Public route – active sliders for home screen
router.get("/active", getActiveSliders);

// Admin routes
router.get("/", authenticate, authorize("ADMIN"), getAllSliders);
router.get("/:id", authenticate, authorize("ADMIN"), getSlider);
router.post("/", authenticate, authorize("ADMIN"), createSlider);
router.put("/:id", authenticate, authorize("ADMIN"), updateSlider);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteSlider);

export default router;