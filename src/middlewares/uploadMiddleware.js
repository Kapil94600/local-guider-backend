// src/middlewares/uploadMiddleware.js
// ═══════════════════════════════════════════════════════════════
// UPLOAD MIDDLEWARE — multer memory storage + filters
// ═══════════════════════════════════════════════════════════════
import multer from "multer";

// ✅ Memory storage — file disk pe nahi, Cloudinary pe direct
const storage = multer.memoryStorage();

// ═══════════════════════════════════════════════════════════════
// FILTER: Images only
// ═══════════════════════════════════════════════════════════════
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: FILTER: Chat media (image + file + voice)
// ═══════════════════════════════════════════════════════════════
const chatMediaFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
    "audio/mpeg",
    "audio/mp4",
    "audio/m4a",
    "audio/aac",
    "audio/wav",
    "audio/3gpp",
    "video/mp4",
    "video/quicktime",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${file.mimetype} is not allowed for chat media`
      ),
      false
    );
  }
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_CHAT_MEDIA_SIZE = 25 * 1024 * 1024; // 25 MB (voice/video bigger)

// ═══════════════════════════════════════════════════════════════
// SINGLE IMAGE UPLOAD (field: "image")
// ═══════════════════════════════════════════════════════════════
export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

// ═══════════════════════════════════════════════════════════════
// MULTIPLE IMAGE UPLOAD (field: "files", max 10)
// ═══════════════════════════════════════════════════════════════
export const uploadMultiple = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: CHAT MEDIA UPLOAD (single file, field: "media")
// ═══════════════════════════════════════════════════════════════
export const uploadChatMedia = multer({
  storage,
  fileFilter: chatMediaFilter,
  limits: { fileSize: MAX_CHAT_MEDIA_SIZE },
});

// ═══════════════════════════════════════════════════════════════
// ROLE REQUEST — 4 named files (KYC)
// ═══════════════════════════════════════════════════════════════
export const uploadRoleRequestFiles = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
}).fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
]);

// ═══════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════
export default {
  upload,
  uploadMultiple,
  uploadChatMedia,
  uploadRoleRequestFiles,
};