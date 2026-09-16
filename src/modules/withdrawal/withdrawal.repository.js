import WithdrawalRequest from "../../database/models/core/WithdrawalRequest.js";
import User from "../../database/models/core/User.js";

export const createWithdrawalRequest = async (payload) => {
  return await WithdrawalRequest.create(payload);
};

export const getWithdrawalRequestsByUser = async (userId) => {
  return await WithdrawalRequest.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
};

export const getAllWithdrawalRequests = async ({ page = 1, limit = 10 } = {}) => {
  return await WithdrawalRequest.findAndCountAll({
    include: [
      {
        model: User,
        as: "User",
        attributes: ["id", "firstName", "lastName", "email", "phone", "role"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
};

export const getWithdrawalRequestById = async (id) => {
  return await WithdrawalRequest.findByPk(id, {
    include: [
      {
        model: User,
        as: "User",
        attributes: ["id", "firstName", "lastName", "email", "phone", "role"],
      },
    ],
  });
};

export const updateWithdrawalRequest = async (id, payload) => {
  const request = await WithdrawalRequest.findByPk(id);
  if (!request) return null;
  await request.update(payload);
  return request;
};