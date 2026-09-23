import express from "express";
import {
  getActiveOffers,
  getAllOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
} from "./offer.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

// Public
router.get("/active", getActiveOffers);

// Admin
router.get("/", authenticate, authorize("ADMIN"), getAllOffers);
router.get("/:id", authenticate, authorize("ADMIN"), getOffer);
router.post("/", authenticate, authorize("ADMIN"), createOffer);
router.put("/:id", authenticate, authorize("ADMIN"), updateOffer);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteOffer);

export default router;