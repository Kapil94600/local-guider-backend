import { createBlock, getBlocks, getBlockById, deleteBlock, deleteAllBlocksForUser } from "./block.repository.js";

export const addBlock = async (userId, blockedUserId, reason) => {
  const blocks = await getBlocks(userId);
  const existing = blocks.find(b => b.blockedUserId === blockedUserId);
  if (existing) {
    await existing.update({ reason: reason || existing.reason });
    return existing;
  }
  return await createBlock({ userId, blockedUserId, reason });
};

export const fetchBlocks = async (userId) => {
  return await getBlocks(userId);
};

export const removeBlock = async (id) => {
  const result = await deleteBlock(id);
  if (!result) throw new Error("Block not found");
  return { message: "Unblocked" };
};

// ✅ New: Remove all blocks for a user
export const removeAllBlocksForUser = async (blockedUserId) => {
  const result = await deleteAllBlocksForUser(blockedUserId);
  return { message: "Unblocked" };
};