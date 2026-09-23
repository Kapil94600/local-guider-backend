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

// ⚠️ Bumped from 5MB → 10MB (live camera photos are bigger)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ✅ Single file upload (field name: "image")
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ✅ Multiple files upload (field name: "files", max 10)
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ✅ Role request — 4 named files (KYC) — used as direct middleware
export const uploadRoleRequestFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
]);