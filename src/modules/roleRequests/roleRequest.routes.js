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
import { uploadRoleRequestFiles } from "../../middlewares/uploadMiddleware.js"; // ✅ new

const router = express.Router();

router.post("/", authenticate, uploadRoleRequestFiles, createRoleRequest); // ✅ multer added

router.get("/my", authenticate, getMyRoleRequests);
router.get("/", authenticate, authorize("ADMIN"), getAllRoleRequests);
router.get("/:id", authenticate, authorize("ADMIN"), getRoleRequest);
router.put("/:id/status", authenticate, authorize("ADMIN"), updateRoleRequest);

export default router;