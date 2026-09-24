// src/utils/cloudinaryUpload.js
// ═══════════════════════════════════════════════════════════════
// CLOUDINARY UPLOAD — unified helper
// ═══════════════════════════════════════════════════════════════
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// ═══════════════════════════════════════════════════════════════
// UPLOAD (simple — returns URL)
// ═══════════════════════════════════════════════════════════════
export const uploadToCloudinary = (fileBuffer, folder = "local-guider") => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) {
      return reject(new Error("File buffer is required"));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        quality: "auto",
        fetch_format: "auto",
        transformation: [{ width: 1920, height: 1920, crop: "limit" }],
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error.message);
          return reject(error);
        }
        if (!result?.secure_url) {
          return reject(new Error("Cloudinary returned no URL"));
        }
        resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// ═══════════════════════════════════════════════════════════════
// UPLOAD WITH METADATA
// ═══════════════════════════════════════════════════════════════
export const uploadToCloudinaryWithMeta = (
  fileBuffer,
  folder = "local-guider"
) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) {
      return reject(new Error("File buffer is required"));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) {
          return reject(new Error("Cloudinary returned no URL"));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
          width: result.width,
          height: result.height,
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Cloudinary delete: ${publicId} → ${result.result}`);
    return result;
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err.message);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// EXTRACT publicId
// ═══════════════════════════════════════════════════════════════
export const extractPublicId = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export default {
  uploadToCloudinary,
  uploadToCloudinaryWithMeta,
  deleteFromCloudinary,
  extractPublicId,
};