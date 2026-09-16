import express from "express";
import { blockUser, getBlocks, unblockUser, unblockUserByBlockedUserId } from "./block.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";

const router = express.Router();

router.post("/", authenticate, authorize("ADMIN"), blockUser);
router.get("/", authenticate, authorize("ADMIN"), getBlocks);
router.delete("/:id", authenticate, authorize("ADMIN"), unblockUser);
// ✅ New: Delete all blocks by blockedUserId
router.delete("/by-user/:blockedUserId", authenticate, authorize("ADMIN"), unblockUserByBlockedUserId);

export default router;