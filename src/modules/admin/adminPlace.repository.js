// src/modules/admin/adminPlace.repository.js
import Place from "../../database/models/core/Place.js";

// ═══════════════════════════════════════════════════════════════
// GET ALL
// ═══════════════════════════════════════════════════════════════
export const getAllPlaces = async () => {
  return await Place.findAll({ order: [["createdAt", "DESC"]] });
};

export const getPlaceById = async (id) => {
  return await Place.findByPk(id);
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-15: Sanitize ONLY provided fields
// Don't overwrite rating/totalReviews with 0 if not provided
// ═══════════════════════════════════════════════════════════════
const sanitizePlaceData = (data, { isUpdate = false } = {}) => {
  const clean = { ...data };

  // ✅ latitude: "" → null, undefined → skip (on update)
  if (clean.latitude === "" || clean.latitude === null) {
    clean.latitude = null;
  } else if (clean.latitude !== undefined) {
    const num = Number(clean.latitude);
    clean.latitude = isNaN(num) ? null : num;
  } else if (isUpdate) {
    delete clean.latitude;
  }

  // ✅ longitude: same handling
  if (clean.longitude === "" || clean.longitude === null) {
    clean.longitude = null;
  } else if (clean.longitude !== undefined) {
    const num = Number(clean.longitude);
    clean.longitude = isNaN(num) ? null : num;
  } else if (isUpdate) {
    delete clean.longitude;
  }

  // ✅ FIX B-15: rating — NEVER reset to 0 on update
  // Rating should only change via review system, not admin edit
  if (isUpdate) {
    // On update, admin CANNOT change rating — remove it
    delete clean.rating;
    delete clean.totalReviews;
  } else {
    // On create, allow rating (default 0)
    if (clean.rating === "" || clean.rating === undefined) {
      clean.rating = 0;
    } else {
      const num = Number(clean.rating);
      clean.rating = isNaN(num) ? 0 : num;
    }
    if (clean.totalReviews === "" || clean.totalReviews === undefined) {
      clean.totalReviews = 0;
    } else {
      const num = Number(clean.totalReviews);
      clean.totalReviews = isNaN(num) ? 0 : num;
    }
  }

  return clean;
};

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createPlace = async (payload) => {
  const clean = sanitizePlaceData(payload, { isUpdate: false });
  return await Place.create(clean);
};

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
export const updatePlaceById = async (id, payload) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  const clean = sanitizePlaceData(payload, { isUpdate: true });
  await place.update(clean);
  return place;
};

// ═══════════════════════════════════════════════════════════════
// STATUS UPDATE
// ═══════════════════════════════════════════════════════════════
export const updatePlaceStatus = async (id, isActive) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.update({ isActive });
  return place;
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const deletePlaceById = async (id) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.destroy();
  return true;
};