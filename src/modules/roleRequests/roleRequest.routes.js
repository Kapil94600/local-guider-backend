import express from "express";
import {
  createRoleRequest,
  getMyRoleRequests,
  getAllRoleRequests,
  getRoleRequest,
  updateRoleRequest,
} from "./roleRequest.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { uploadRoleRequestFiles } from "../../middlewares/uploadMiddleware.js";
import {
  validateRoleRequest,
  validateRoleRequestStatus,
} from "../../middlewares/roleMiddleware.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: Multer FIRST (parses multipart body + files),
//         then validation runs (req.body is now populated)
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authenticate,
  uploadRoleRequestFiles,       // ✅ multer parses body + files FIRST
  validateRoleRequest,           // ✅ now req.body.requestedRole available
  createRoleRequest
);

router.get("/my", authenticate, getMyRoleRequests);

// ── Admin ──
router.get("/", authenticate, authorize("ADMIN"), getAllRoleRequests);
router.get("/:id", authenticate, authorize("ADMIN"), getRoleRequest);
router.put(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  validateRoleRequestStatus,
  updateRoleRequest
);

export default router;