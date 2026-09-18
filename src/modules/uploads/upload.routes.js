// src/modules/uploads/upload.routes.js
import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { upload } from "../../middlewares/uploadMiddleware.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";

const router = express.Router();

// ⚡ Single image
router.post(
  "/",
  authenticate,
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      const url = await uploadToCloudinary(req.file.buffer, "local-guider/uploads");
      return res.status(200).json({ success: true, url, data: { url } });
    } catch (error) {
      console.error("❌ Upload error:", error.message);
      next(error);
    }
  }
);

// ⚡ Multiple images
router.post(
  "/multiple",
  authenticate,
  upload.array("images", 5),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "No files uploaded" });
      }
      const urls = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, "local-guider/uploads"))
      );
      return res.status(200).json({ success: true, urls, data: { urls } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;