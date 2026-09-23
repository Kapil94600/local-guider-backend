// src/modules/roleRequests/roleRequest.repository.js
import RoleRequest from "../../database/models/core/RoleRequest.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createRoleRequest = async (payload, options = {}) => {
  return await RoleRequest.create(payload, options);
};

// ═══════════════════════════════════════════════════════════════
// FETCH — all role requests (admin)
// ═══════════════════════════════════════════════════════════════
export const getRoleRequests = async () => {
  return await RoleRequest.findAll({
    include: [
      {
        model: User,
        as: "user",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "profileImage",
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// FETCH by ID (with optional transaction + lock)
// ═══════════════════════════════════════════════════════════════
export const getRoleRequestById = async (id, transaction = null) => {
  return await RoleRequest.findByPk(id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "profileImage",
        ],
      },
    ],
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
};

// ═══════════════════════════════════════════════════════════════
// FETCH — user's own requests
// ═══════════════════════════════════════════════════════════════
export const getUserRoleRequests = async (userId) => {
  return await RoleRequest.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// CHECK — pending request for user + role
// ═══════════════════════════════════════════════════════════════
export const getPendingUserRequest = async (userId, requestedRole) => {
  return await RoleRequest.findOne({
    where: { userId, requestedRole, status: "PENDING" },
  });
};

// ═══════════════════════════════════════════════════════════════
// UPDATE (with optional transaction)
// ═══════════════════════════════════════════════════════════════
export const updateRoleRequest = async (id, payload, options = {}) => {
  const { transaction } = options;
  const request = await RoleRequest.findByPk(id, { transaction });
  if (!request) return null;
  await request.update(payload, { transaction });
  return request;
};