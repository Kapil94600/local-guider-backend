import express from "express";
import {
  createGuiderPlan,
  getGuiderPlans,
  getGuiderPlan,
  editGuiderPlan,
  deleteGuiderPlan,
} from "./guiderPlan.controller.js";

const router = express.Router();

router.post("/", createGuiderPlan);
router.get("/", getGuiderPlans);
router.get("/:id", getGuiderPlan);
router.put("/:id", editGuiderPlan);
router.delete("/:id", deleteGuiderPlan);

export default router;