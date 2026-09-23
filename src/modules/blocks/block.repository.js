import Block from "../../database/models/core/Block.js";
import User from "../../database/models/core/User.js";

export const createBlock = async (payload) => {
  return await Block.create(payload);
};

export const getBlocks = async (userId) => {
  return await Block.findAll({
    where: { userId },
    include: [
      {
        model: User,
        as: "blocked",
        attributes: ["id", "firstName", "lastName", "profileImage"],
      },
    ],
  });
};

export const getBlockById = async (id) => {
  return await Block.findByPk(id);
};

export const deleteBlock = async (id) => {
  const block = await Block.findByPk(id);
  if (!block) return null;
  await block.destroy();
  return true;
};

// ✅ New: Delete all blocks for a user
export const deleteAllBlocksForUser = async (blockedUserId) => {
  return await Block.destroy({ where: { blockedUserId } });
};


// ═══════════════════════════════════════════════════════════════
// ✅ NEW: Check if a user is blocked by an admin
// Admin-block convention: userId = admin's id, blockedUserId = target
// ═══════════════════════════════════════════════════════════════
export const isUserBlocked = async (userId) => {
  const block = await Block.findOne({
    where: { blockedUserId: userId },
    include: [
      {
        model: User,
        as: "blocker",
        attributes: ["id", "role"],
        where: { role: "ADMIN" },
        required: true,
      },
    ],
  });
  return !!block;
};