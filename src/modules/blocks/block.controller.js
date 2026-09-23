// src/modules/blocks/block.controller.js
import { ApiResponse } from "../../utils/apiResponse.js";
import {
  addBlock,
  fetchBlocks,
  removeBlock,
  removeAllBlocksForUser,
} from "./block.service.js";
import { clearBlockCache } from "../../middlewares/authMiddleware.js";

// ═══════════════════════════════════════════════════════════════
// BLOCK USER — emits `user:blocked` socket event
// ═══════════════════════════════════════════════════════════════
export const blockUser = async (req, res, next) => {
  try {
    const block = await addBlock(
      req.user.id,
      req.body.blockedUserId,
      req.body.reason
    );

    // ✅ Invalidate cache for blocked user
    clearBlockCache(req.body.blockedUserId);

    // ✅ Emit real-time socket event
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("user:blocked", {
          userId: req.body.blockedUserId,
          blockedUserId: req.body.blockedUserId,
          reason: req.body.reason || "Admin block",
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 user:blocked emitted → ${req.body.blockedUserId.slice(0, 8)}`
        );
      }
    } catch (socketErr) {
      console.error("❌ Socket emit failed:", socketErr.message);
    }

    return ApiResponse.success(res, "User blocked successfully", block);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET BLOCKS
// ═══════════════════════════════════════════════════════════════
export const getBlocks = async (req, res, next) => {
  try {
    const blocks = await fetchBlocks(req.user.id);
    return ApiResponse.success(res, "Blocked users", blocks);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// UNBLOCK — by block ID
// ═══════════════════════════════════════════════════════════════
export const unblockUser = async (req, res, next) => {
  try {
    const result = await removeBlock(req.params.id);

    // ✅ Clear entire cache (safer)
    clearBlockCache();

    // ✅ Emit socket event
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("user:unblocked", {
          blockId: req.params.id,
          timestamp: new Date().toISOString(),
        });
        console.log(`📡 user:unblocked emitted → block:${req.params.id.slice(0, 8)}`);
      }
    } catch (socketErr) {
      console.error("❌ Socket emit failed:", socketErr.message);
    }

    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// UNBLOCK — by blockedUserId
// ═══════════════════════════════════════════════════════════════
export const unblockUserByBlockedUserId = async (req, res, next) => {
  try {
    const result = await removeAllBlocksForUser(req.params.blockedUserId);

    // ✅ Invalidate specific user
    clearBlockCache(req.params.blockedUserId);

    // ✅ Emit socket event
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("user:unblocked", {
          userId: req.params.blockedUserId,
          blockedUserId: req.params.blockedUserId,
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 user:unblocked emitted → ${req.params.blockedUserId.slice(0, 8)}`
        );
      }
    } catch (socketErr) {
      console.error("❌ Socket emit failed:", socketErr.message);
    }

    return ApiResponse.success(res, result.message, null);
  } catch (error) {
    next(error);
  }
};