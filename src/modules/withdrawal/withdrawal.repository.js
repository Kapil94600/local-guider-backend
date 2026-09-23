// src/modules/withdrawal/withdrawal.repository.js
import { Op } from "sequelize";
import WithdrawalRequest from "../../database/models/core/WithdrawalRequest.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createWithdrawalRequest = async (payload, options = {}) => {
  return await WithdrawalRequest.create(payload, options);
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-1: Pending check WITH LOCK (prevents race condition)
// ═══════════════════════════════════════════════════════════════
export const findPendingByUserId = async (userId, transaction = null) => {
  return await WithdrawalRequest.findOne({
    where: { userId, status: "PENDING" },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined, // ✅ Lock!
    attributes: ["id", "amount", "status", "createdAt"],
  });
};

// ═══════════════════════════════════════════════════════════════
// FETCH — my requests
// ═══════════════════════════════════════════════════════════════
export const getWithdrawalRequestsByUser = async (userId) => {
  return await WithdrawalRequest.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// FETCH all (admin)
// ═══════════════════════════════════════════════════════════════
export const getAllWithdrawalRequests = async ({
  page = 1,
  limit = 10,
  status,
  search,
} = {}) => {
  const where = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search && search.trim()) {
    const s = search.trim();
    const orConds = [
      { bankName: { [Op.iLike]: `%${s}%` } },
      { accountNumber: { [Op.iLike]: `%${s}%` } },
      { accountName: { [Op.iLike]: `%${s}%` } },
    ];

    const num = parseFloat(s);
    if (!isNaN(num) && num > 0) {
      orConds.push({ amount: num });
    }

    where[Op.or] = orConds;
  }

  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  return await WithdrawalRequest.findAndCountAll({
    where,
    include: [
      {
        model: User,
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "role",
          "profileImage",
        ],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset,
    distinct: true,
  });
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-8: FETCH by ID — lock WITHOUT include (avoids PG error)
// ═══════════════════════════════════════════════════════════════
export const getWithdrawalRequestById = async (id, transaction = null) => {
  // ✅ If transaction provided (lock), skip include — separately fetch user
  if (transaction) {
    const request = await WithdrawalRequest.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!request) return null;

    // ✅ Fetch user separately (no lock on User)
    const user = await User.findByPk(request.userId, {
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "phone",
        "role",
        "profileImage",
      ],
      transaction, // No lock — read only
    });

    // Merge into a plain object
    const json = request.toJSON();
    json.User = user ? user.toJSON() : null;
    return json;
  }

  // ✅ No transaction → include User safely
  const request = await WithdrawalRequest.findByPk(id, {
    include: [
      {
        model: User,
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "role",
          "profileImage",
        ],
        required: false,
      },
    ],
  });

  return request;
};

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
export const updateWithdrawalRequest = async (id, payload, options = {}) => {
  const { transaction } = options;
  const request = await WithdrawalRequest.findByPk(id, { transaction });
  if (!request) return null;
  await request.update(payload, { transaction });
  return request;
};