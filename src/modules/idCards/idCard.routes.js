// src/modules/idCards/idCard.routes.js
import express from "express";
import {
  getMyIdCardController,
  getIdCards,
  getIdCardById,   // ✅ Added
  revokeIdCard,
} from "./idCard.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router.get("/my", authenticate, getMyIdCardController);

// ✅ Specific route BEFORE :id
router.get("/", authenticate, authorize("ADMIN"), getIdCards);
router.get("/:id", authenticate, authorize("ADMIN"), getIdCardById);   // ✅ Added
router.put("/:id/revoke", authenticate, authorize("ADMIN"), revokeIdCard);

export default router;