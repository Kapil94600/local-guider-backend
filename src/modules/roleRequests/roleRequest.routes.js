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
} from "../../middlewares/roleMiddleware.js"; // ✅ NEW FILE

const router = express.Router();

// User submit — validate PEHLE, multer BAAD me
router.post(
  "/",
  authenticate,
  validateRoleRequest,          // ✅ ADDED
  uploadRoleRequestFiles,
  createRoleRequest
);

router.get("/my", authenticate, getMyRoleRequests);

// Admin
router.get("/", authenticate, authorize("ADMIN"), getAllRoleRequests);
router.get("/:id", authenticate, authorize("ADMIN"), getRoleRequest);
router.put(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  validateRoleRequestStatus,    // ✅ ADDED
  updateRoleRequest
);

export default router;