// src/middlewares/uploadMiddleware.js
import multer from "multer";

// ═══════════════════════════════════════════
// ⚡ MEMORY storage — file disk pe save nahi hogi
// Cloudinary pe directly upload hoga (permanent)
// ═══════════════════════════════════════════
const storage = multer.memoryStorage();

// ═══════════════════════════════════════════
// Base upload (image only, 5MB max)
// ═══════════════════════════════════════════
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

// ═══════════════════════════════════════════
// ✅ Role request ke 4 files
// ═══════════════════════════════════════════
export const uploadRoleRequestFiles = upload.fields([
  { name: "selfie", maxCount: 1 },
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
  { name: "profilePhoto", maxCount: 1 },
]);