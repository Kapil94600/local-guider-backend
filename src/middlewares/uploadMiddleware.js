// src/middlewares/uploadMiddleware.js
import multer from "multer";

// ✅ Memory storage — file disk pe save nahi hogi, Cloudinary pe direct jayegi
const storage = multer.memoryStorage();

// ✅ File filter — only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// ✅ Single file upload (field name: "image")
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ✅ Multiple files upload (field name: "files", max 10)
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ✅ KYC fields (role request) — 4 named fields
export const uploadKyc = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});