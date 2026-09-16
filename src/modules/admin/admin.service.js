import {
  getDashboardStats,
} from "./admin.repository.js";

export const fetchDashboard =
  async () => {
    return await getDashboardStats();
  };