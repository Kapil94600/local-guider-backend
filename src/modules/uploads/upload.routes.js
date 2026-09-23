// src/modules/uploads/upload.routes.js
import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import {
  upload,
  uploadMultiple,
} from "../../middlewares/uploadMiddleware.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";

const router = express.Router();

// ✅ FIX B-4: Folder whitelist — client cannot control
const ALLOWED_FOLDERS = [
  "local-guider/uploads",
  "local-guider/gallery",
  "local-guider/profiles",
  "local-guider/reviews",
  "local-guider/role-requests",
  "local-guider/guiders",
  "local-guider/guiders/gallery",
  "local-guider/photographers",
  "local-guider/photographers/gallery",
  "local-guider/places",
  "local-guider/places/gallery",
  "local-guider/offers",
  "local-guider/sliders",
  "local-guider/migrated",
];

const resolveFolder = (requestedFolder, fallback = "local-guider/uploads") => {
  if (!requestedFolder || typeof requestedFolder !== "string") {
    return fallback;
  }
  const clean = requestedFolder.trim();
  if (ALLOWED_FOLDERS.includes(clean)) {
    return clean;
  }
  return fallback;
};

// ═══════════════════════════════════════════
// ✅ POST /api/v1/uploads — Single image
// ═══════════════════════════════════════════
router.post(
  "/",
  authenticate,
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const folder = resolveFolder(req.body.folder, "local-guider/uploads");
      const url = await uploadToCloudinary(req.file.buffer, folder);

      return res.status(200).json({
        success: true,
        url,
        data: { url },
      });
    } catch (error) {
      console.error("❌ Upload single error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Upload failed",
      });
    }
  }
);

// ═══════════════════════════════════════════
// ✅ POST /api/v1/uploads/multiple — Multiple images
// ═══════════════════════════════════════════
router.post(
  "/multiple",
  authenticate,
  uploadMultiple.array("files", 10),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      const folder = resolveFolder(req.body.folder, "local-guider/gallery");

      // ✅ Parallel upload to Cloudinary
      const urls = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, folder))
      );

      return res.status(200).json({
        success: true,
        message: `${urls.length} file(s) uploaded successfully`,
        data: {
          urls,
          files: urls.map((u) => ({ url: u })),
        },
      });
    } catch (error) {
      console.error("❌ Upload multiple error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Upload failed",
      });
    }
  }
);

export default router;