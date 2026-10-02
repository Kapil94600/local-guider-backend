// src/modules/places/place.repository.js
import { Op, literal, fn, col } from "sequelize";
import Place from "../../database/models/core/Place.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createPlace = async (payload) => {
  return await Place.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// GET ALL PLACES — with optional filters (existing)
// ═══════════════════════════════════════════════════════════════
export const getAllPlaces = async ({
  city,
  category,
  page = 1,
  limit = 10,
  includeInactive = false,
} = {}) => {
  const where = {};
  if (city) where.city = city;
  if (category) where.category = category;

  if (!includeInactive) {
    where.isActive = true;
  }

  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const safePage = Math.max(parseInt(page) || 1, 1);

  return await Place.findAndCountAll({
    where,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["createdAt", "DESC"]],
  });
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: GET NEARBY PLACES — smart location-based sorting
// ═══════════════════════════════════════════════════════════════
//
// Tier priority:
//   1. SAME_CITY      — user's current city (e.g., Fatehpur)
//   2. SAME_DISTRICT  — same district (e.g., Sikar)
//   3. NEARBY         — within `radius` km (default 50 km)
//   4. SAME_STATE     — same state (e.g., Rajasthan)
//   5. OTHER          — all other places
//
// Within each tier, places are sorted by distance (nearest first)
//
export const getNearbyPlaces = async ({
  lat,
  lng,
  city,
  district,
  state,
  radius = 50,
  limit = 30,
}) => {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 30, 1), 100);
  const safeRadius = Math.min(Math.max(parseInt(radius) || 50, 1), 500);

  // Normalize inputs
  const normCity = city ? String(city).trim() : null;
  const normDistrict = district ? String(district).trim() : null;
  const normState = state ? String(state).trim() : null;

  // Has valid coordinates?
  const hasCoords =
    lat != null &&
    lng != null &&
    !isNaN(parseFloat(lat)) &&
    !isNaN(parseFloat(lng));

  const latNum = hasCoords ? parseFloat(lat) : null;
  const lngNum = hasCoords ? parseFloat(lng) : null;

  // ═══════════════════════════════════════════════════════════
  // FALLBACK: If no coordinates, use city/district/state filter
  // ═══════════════════════════════════════════════════════════
  if (!hasCoords) {
    const where = { isActive: true };

    // Build OR conditions
    const orConditions = [];
    if (normCity) orConditions.push({ city: normCity });
    if (normDistrict) orConditions.push({ district: normDistrict });
    if (normState) orConditions.push({ state: normState });

    if (orConditions.length > 0) {
      where[Op.or] = orConditions;
    }

    const places = await Place.findAll({
      where,
      limit: safeLimit,
      order: [
        // Same city first
        [
          literal(
            normCity
              ? `CASE WHEN city = '${normCity.replace(/'/g, "''")}' THEN 0 ELSE 1 END`
              : `0`
          ),
          "ASC",
        ],
        // Same district second
        [
          literal(
            normDistrict
              ? `CASE WHEN district = '${normDistrict.replace(/'/g, "''")}' THEN 0 ELSE 1 END`
              : `0`
          ),
          "ASC",
        ],
        ["rating", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    return places.map((p) => ({
      ...p.toJSON(),
      distance: null,
      tier: computeTier(p, { normCity, normDistrict, normState }, null),
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // Haversine formula for distance in km
  // ═══════════════════════════════════════════════════════════
  const haversine = `
    6371 * acos(
      LEAST(1.0,
        cos(radians(${latNum})) *
        cos(radians("latitude")) *
        cos(radians("longitude") - radians(${lngNum})) +
        sin(radians(${latNum})) *
        sin(radians("latitude"))
      )
    )
  `;

  // Escape single quotes in SQL literals
  const escCity = normCity ? normCity.replace(/'/g, "''") : null;
  const escDistrict = normDistrict ? normDistrict.replace(/'/g, "''") : null;
  const escState = normState ? normState.replace(/'/g, "''") : null;

  // Tier priority CASE statement
  const tierCase = `
    CASE
      ${escCity ? `WHEN "city" = '${escCity}' THEN 1` : ""}
      ${escDistrict ? `WHEN "district" = '${escDistrict}' THEN 2` : ""}
      WHEN (${haversine}) <= ${safeRadius} THEN 3
      ${escState ? `WHEN "state" = '${escState}' THEN 4` : ""}
      ELSE 5
    END
  `;

  const places = await Place.findAll({
    where: {
      isActive: true,
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
    },
    attributes: {
      include: [[literal(`(${haversine})`), "distance"]],
    },
    order: [
      [literal(tierCase), "ASC"],           // Tier priority
      [literal(`(${haversine})`), "ASC"],   // Then distance
      ["rating", "DESC"],
    ],
    limit: safeLimit,
    raw: true,
  });

  return places.map((p) => ({
    ...p,
    distance: p.distance != null ? parseFloat(p.distance) : null,
    tier: computeTier(
      p,
      { normCity, normDistrict, normState },
      p.distance != null ? parseFloat(p.distance) : null,
      safeRadius
    ),
  }));
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Compute tier for a place
// ═══════════════════════════════════════════════════════════════
const computeTier = (place, { normCity, normDistrict, normState }, distance, radius = 50) => {
  const pCity = place.city ? String(place.city).trim() : null;
  const pDistrict = place.district ? String(place.district).trim() : null;
  const pState = place.state ? String(place.state).trim() : null;

  if (normCity && pCity === normCity) return "SAME_CITY";
  if (normDistrict && pDistrict === normDistrict) return "SAME_DISTRICT";
  if (distance != null && distance <= radius) return "NEARBY";
  if (normState && pState === normState) return "SAME_STATE";
  return "OTHER";
};

// ═══════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════
export const getPlaceById = async (id) => {
  return await Place.findByPk(id);
};

// ═══════════════════════════════════════════════════════════════
// FEATURED
// ═══════════════════════════════════════════════════════════════
export const getFeatured = async () => {
  return await Place.findAll({
    where: { isFeatured: true, isActive: true },
    limit: 5,
  });
};

// ═══════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════
export const searchPlaces = async (q, city) => {
  if (!q || !q.trim()) {
    throw new Error("Search query is required");
  }

  const where = {
    isActive: true,
    [Op.or]: [
      { name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } },
      { category: { [Op.iLike]: `%${q}%` } },
      { city: { [Op.iLike]: `%${q}%` } },
      { district: { [Op.iLike]: `%${q}%` } },
      { state: { [Op.iLike]: `%${q}%` } },
    ],
  };
  if (city) where.city = city;
  return await Place.findAll({ where, limit: 50 });
};

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
export const updatePlaceById = async (id, payload) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.update(payload);
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

// ═══════════════════════════════════════════════════════════════
// GALLERY (unchanged)
// ═══════════════════════════════════════════════════════════════
export const addGalleryImage = async (placeId, imageUrl) => {
  const place = await Place.findByPk(placeId);
  if (!place) return null;
  const gallery = Array.isArray(place.gallery) ? place.gallery : [];
  gallery.push(imageUrl);
  await place.update({ gallery });
  return place;
};

export const removeGalleryImage = async (placeId, imageUrl) => {
  const place = await Place.findByPk(placeId);
  if (!place) return null;
  const gallery = (Array.isArray(place.gallery) ? place.gallery : []).filter(
    (url) => url !== imageUrl
  );
  await place.update({ gallery });
  return place;
};

export const replaceGallery = async (placeId, images) => {
  const place = await Place.findByPk(placeId);
  if (!place) return null;
  await place.update({ gallery: images });
  return place;
};