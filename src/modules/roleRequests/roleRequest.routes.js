// src/modules/roleRequests/roleRequest.routes.js
import express from "express";
import {
  createRoleRequest,
  getMyRoleRequests,
  getAllRoleRequests,
  getRoleRequest,
} from "./roleRequest.controller.js";
// ✅ Admin approval + doc edit — single source
import {
  updateRoleRequestStatus,
  updateRoleRequestDocs,   // ✅ NEW
} from "../admin/adminRoleRequest.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { uploadRoleRequestFiles } from "../../middlewares/uploadMiddleware.js";
import {
  validateRoleRequest,
  validateRoleRequestStatus,
} from "../../middlewares/roleMiddleware.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authenticate,
  uploadRoleRequestFiles,
  validateRoleRequest,
  createRoleRequest
);

router.get("/my", authenticate, getMyRoleRequests);

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════
router.get("/", authenticate, authorize("ADMIN"), getAllRoleRequests);
router.get("/:id", authenticate, authorize("ADMIN"), getRoleRequest);

// ✅ NEW: Admin can edit docs before approval
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  updateRoleRequestDocs
);

// ✅ Admin approves/rejects
router.put(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  validateRoleRequestStatus,
  updateRoleRequestStatus
);

export default router;