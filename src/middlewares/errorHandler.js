import { ApiError } from "../utils/apiError.js";

export const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  // ✅ Known errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // ✅ Sequelize validation
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: err.errors.map((e) => e.message).join(", "),
    });
  }

  // ✅ Sequelize unique constraint
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
    });
  }

  // ✅ Multer file upload error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large",
    });
  }

  // ✅ Default 500
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};