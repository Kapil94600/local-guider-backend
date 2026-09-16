import { ApiResponse } from "../../utils/apiResponse.js";
import { addBlock, fetchBlocks, removeBlock, removeAllBlocksForUser } from "./block.service.js";

export const blockUser = async (req, res, next) => {
  try {
    const block = await addBlock(req.user.id, req.body.blockedUserId, req.body.reason);
    return ApiResponse.success(res, "User blocked successfully", block);
  } catch (error) { next(error); }
};

export const getBlocks = async (req, res, next) => {
  try {
    const blocks = await fetchBlocks(req.user.id);
    return ApiResponse.success(res, "Blocked users", blocks);
  } catch (error) { next(error); }
};

export const unblockUser = async (req, res, next) => {
  try {
    const result = await removeBlock(req.params.id);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};

// ✅ New: Unblock by blockedUserId
export const unblockUserByBlockedUserId = async (req, res, next) => {
  try {
    const result = await removeAllBlocksForUser(req.params.blockedUserId);
    return ApiResponse.success(res, result.message, null);
  } catch (error) { next(error); }
};