import RoleRequest from "../../database/models/core/RoleRequest.js";

export const createRoleRequest = async (
  payload
) => {
  return await RoleRequest.create(
    payload
  );
};

export const getRoleRequests = async () => {
  return await RoleRequest.findAll({
    order: [
      ["createdAt", "DESC"],
    ],
  });
};

export const getRoleRequestById =
  async (id) => {
    return await RoleRequest.findByPk(
      id
    );
  };

export const getUserRoleRequests =
  async (userId) => {
    return await RoleRequest.findAll({
      where: {
        userId,
      },
      order: [
        ["createdAt", "DESC"],
      ],
    });
  };

export const getPendingUserRequest =
  async (
    userId,
    requestedRole
  ) => {
    return await RoleRequest.findOne({
      where: {
        userId,
        requestedRole,
        status: "PENDING",
      },
    });
  };

export const updateRoleRequest =
  async (
    id,
    payload
  ) => {
    const request =
      await RoleRequest.findByPk(id);

    if (!request) {
      return null;
    }

    await request.update(payload);

    return request;
  };