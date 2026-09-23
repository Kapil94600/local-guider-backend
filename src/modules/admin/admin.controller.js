import { ApiResponse } from "../../utils/apiResponse.js";

import {
  fetchDashboard,
} from "./admin.service.js";

export const dashboardStats =
  async (
    req,
    res,
    next
  ) => {
    try {
      const stats =
        await fetchDashboard();

      return ApiResponse.success(
        res,
        "Dashboard stats fetched successfully",
        stats
      );
    } catch (error) {
      next(error);
    }
  };