// src/middlewares/errorHandler.js
import { ApiError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLER
// ═══════════════════════════════════════════════════════════════
export const errorHandler = (err, req, res, next) => {
  // ═══════════════════════════════════════════════════════════
  // Log full stack (server-side only)
  // ═══════════════════════════════════════════════════════════
  const isServerError =
    !err.statusCode || err.statusCode >= 500;

  if (isServerError) {
    logger.error(
      `[${req.method} ${req.originalUrl}] ${err.message}`,
      {
        stack: err.stack,
        userId: req.user?.id || null,
        ip: req.ip,
      }
    );
  } else {
    logger.warn(
      `[${req.method} ${req.originalUrl}] ${err.message}`,
      { statusCode: err.statusCode, userId: req.user?.id || null }
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ Known ApiError
  // ═══════════════════════════════════════════════════════════
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ Sequelize Validation Error
  // ═══════════════════════════════════════════════════════════
  if (err.name === "SequelizeValidationError") {
    const messages = (err.errors || [])
      .map((e) => e.message)
      .filter(Boolean);
    return res.status(400).json({
      success: false,
      message: messages.join(", ") || "Validation error",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ Sequelize Unique Constraint
  // ═══════════════════════════════════════════════════════════
  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors?.[0]?.path || "field";
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ Sequelize Foreign Key Constraint
  // ═══════════════════════════════════════════════════════════
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({
      success: false,
      message: "Invalid reference — related record not found",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ Sequelize Database Error
  // ═══════════════════════════════════════════════════════════
  if (err.name === "SequelizeDatabaseError") {
    return res.status(500).json({
      success: false,
      message: "Database error occurred",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ Multer file upload errors
  // ═══════════════════════════════════════════════════════════
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large (max 10MB)",
    });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected file field",
    });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ JWT errors
  // ═══════════════════════════════════════════════════════════
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ CORS errors
  // ═══════════════════════════════════════════════════════════
  if (err.message?.startsWith("Not allowed by CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy: origin not allowed",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ Custom validation (has statusCode)
  // ═══════════════════════════════════════════════════════════
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ Default 500 — hide internals in production
  // ═══════════════════════════════════════════════════════════
  const isProd = env.NODE_ENV === "production";

  return res.status(500).json({
    success: false,
    message: isProd
      ? "Internal Server Error"
      : err.message || "Something went wrong",
    // ✅ Only include stack in dev
    ...(isProd ? {} : { stack: err.stack }),
  });
};