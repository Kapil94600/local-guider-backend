// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../database/models/core/User.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // ✅ FRESH role from DB — so stale JWT role doesn't cause Access Denied
    const dbUser = await User.findByPk(decoded.id, {
      attributes: ["id", "role", "isActive", "accountStatus"],
    });

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    if (!dbUser.isActive || dbUser.accountStatus === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message: "Account is blocked or inactive",
      });
    }

    // ✅ Override role from DB (not from stale token)
    req.user = {
      ...decoded,
      role: dbUser.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};