// src/modules/uploads/upload.routes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only images allowed"));
    cb(null, true);
  },
});

// ✅ Single — return relative path
router.post("/", authenticate, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, url: fileUrl, data: { url: fileUrl } });
});

// ✅ Multiple — return relative paths
router.post("/multiple", authenticate, upload.array("images", 5), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No files uploaded" });
  const urls = req.files.map((file) => `/uploads/${file.filename}`);
  res.status(200).json({ success: true, urls, data: { urls } });
});

export default router;