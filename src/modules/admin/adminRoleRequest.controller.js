import { ApiResponse } from "../../utils/apiResponse.js";
import RoleRequest from "../../database/models/core/RoleRequest.js";
import User from "../../database/models/core/User.js";

// ✅ Get all role requests (with user details)
export const getRoleRequests = async (req, res, next) => {
  try {
    const roleRequests = await RoleRequest.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "phone", "profileImage"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return ApiResponse.success(res, "Role requests fetched", roleRequests);
  } catch (error) {
    next(error);
  }
};

// ✅ Update role request status (approve/reject) – Optional if you have separate endpoint
export const updateRoleRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminMessage } = req.body;
    const roleRequest = await RoleRequest.findByPk(id);
    if (!roleRequest) {
      return res.status(404).json({ success: false, message: "Role request not found" });
    }
    await roleRequest.update({ status, adminMessage: adminMessage || null });
    return ApiResponse.success(res, "Role request status updated", roleRequest);
  } catch (error) {
    next(error);
  }
};