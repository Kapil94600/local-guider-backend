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

    // Defensive guard — surfaces the real cause instead of a cryptic
    // "Cannot read properties of undefined (reading 'upload_stream')"
    if (!cloudinary?.uploader?.upload_stream) {
      return reject(
        new Error(
          "Cloudinary is not configured. Check src/config/cloudinary.js " +
          "and ensure CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are set."
        )
      );
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
// UPLOAD WITH METADATA (URL + publicId for deletion)
// ═══════════════════════════════════════════════════════════════
export const uploadToCloudinaryWithMeta = (
  fileBuffer,
  folder = "local-guider"
) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) {
      return reject(new Error("File buffer is required"));
    }

    if (!cloudinary?.uploader?.upload_stream) {
      return reject(
        new Error(
          "Cloudinary is not configured. Check src/config/cloudinary.js " +
          "and ensure CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are set."
        )
      );
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error.message);
          return reject(error);
        }
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
// DELETE FROM CLOUDINARY
// ═══════════════════════════════════════════════════════════════
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;

  if (!cloudinary?.uploader?.destroy) {
    console.error(
      "❌ Cloudinary is not configured — cannot delete:",
      publicId
    );
    return null;
  }

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
// EXTRACT publicId FROM URL
// URL: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg
// publicId: folder/name
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