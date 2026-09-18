// src/modules/uploads/upload.routes.js
import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import {
  upload,
  uploadMultiple,
} from "../../middlewares/uploadMiddleware.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";

const router = express.Router();

// ═══════════════════════════════════════════
// ✅ POST /api/v1/uploads — Single image
// Field name: "image"
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

      const folder = req.body.folder || "local-guider/uploads";
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
// Field name: "files" (max 10)
// Frontend GalleryManager isko hit karta hai
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

      const folder = req.body.folder || "local-guider/gallery";

      // ✅ Parallel upload to Cloudinary
      const urls = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, folder))
      );

      return res.status(200).json({
        success: true,
        message: `${urls.length} file(s) uploaded successfully`,
        data: {
          urls,              // ✅ Frontend GalleryManager isko use karta hai
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