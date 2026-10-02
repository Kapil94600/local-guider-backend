// src/modules/places/place.repository.js
// ═══════════════════════════════════════════════════════════════
// PLACE REPOSITORY — District + Distance based sorting
// Priority: SAME_CITY → NEARBY → SAME_DISTRICT → OTHER
// ═══════════════════════════════════════════════════════════════
import { Op } from "sequelize";
import Place from "../../database/models/core/Place.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createPlace = async (payload) => {
  return await Place.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// NORMALIZE (lowercase + trim)
// ═══════════════════════════════════════════════════════════════
const normalize = (str) => {
  if (!str) return null;
  return String(str).trim().toLowerCase();
};

// ═══════════════════════════════════════════════════════════════
// CITY MATCH — first word comparison
// "Fatehpur Shekhawati" ↔ "Fatehpur" → true
// "Sikar" ↔ "Fatehpur" → false
// ═══════════════════════════════════════════════════════════════
const cityMatch = (placeCity, userCity) => {
  if (!placeCity || !userCity) return false;
  const pc = normalize(placeCity);
  const uc = normalize(userCity);
  if (pc === uc) return true;

  const pcFirst = pc.split(/\s+/)[0];
  const ucFirst = uc.split(/\s+/)[0];
  return pcFirst === ucFirst;
};

// ═══════════════════════════════════════════════════════════════
// DISTRICT MATCH — exact comparison (normalized)
// ═══════════════════════════════════════════════════════════════
const districtMatch = (placeDistrict, userDistrict) => {
  if (!placeDistrict || !userDistrict) return false;
  return normalize(placeDistrict) === normalize(userDistrict);
};

// ═══════════════════════════════════════════════════════════════
// HAVERSINE DISTANCE (km)
// ═══════════════════════════════════════════════════════════════
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ═══════════════════════════════════════════════════════════════
// COMPUTE TIER — 4 tiers
// ═══════════════════════════════════════════════════════════════
const computeTier = (
  place,
  { normCity, normDistrict },
  distance,
  radius = 50
) => {
  // Tier 1: SAME_CITY
  if (normCity && cityMatch(place.city, normCity)) {
    return "SAME_CITY";
  }

  // Tier 2: NEARBY (within radius) — computed from distance
  if (distance != null && distance <= radius) {
    return "NEARBY";
  }

  // Tier 3: SAME_DISTRICT
  if (normDistrict && districtMatch(place.district, normDistrict)) {
    return "SAME_DISTRICT";
  }

  // Tier 4: OTHER
  return "OTHER";
};

// ═══════════════════════════════════════════════════════════════
// TIER → PRIORITY
// ═══════════════════════════════════════════════════════════════
const tierToPriority = (tier) => {
  switch (tier) {
    case "SAME_CITY":
      return 1;
    case "NEARBY":
      return 2;
    case "SAME_DISTRICT":
      return 3;
    case "OTHER":
    default:
      return 4;
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ GET NEARBY PLACES — 4-tier district + distance aware
//
// Strategy:
//  1. Fetch ALL active places (limit 500)
//  2. Compute distance + tier for each
//  3. Sort by tier priority → distance → rating
//  4. Return everything (mobile will filter by tier)
//
// Why not filter in DB?
//   - District matching is tricky (state_district vs district)
//   - Small dataset (500 max) so memory filter is fine
//   - Avoids SQL case-sensitivity issues
// ═══════════════════════════════════════════════════════════════
export const getNearbyPlaces = async ({
  lat,
  lng,
  city,
  district,
  state,
  radius = 50,
  limit = 100,
}) => {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  const safeRadius = Math.min(Math.max(parseInt(radius) || 50, 1), 500);

  const normCity = city ? String(city).trim() : null;
  const normDistrict = district ? String(district).trim() : null;

  const latNum = lat != null ? parseFloat(lat) : null;
  const lngNum = lng != null ? parseFloat(lng) : null;
  const hasCoords =
    latNum != null && lngNum != null && !isNaN(latNum) && !isNaN(lngNum);

  console.log("🔍 [getNearbyPlaces] Input:", {
    city: normCity,
    district: normDistrict,
    state: state || null,
    hasCoords,
    lat: latNum,
    lng: lngNum,
    radius: safeRadius,
  });

  // ═══════════════════════════════════════════════════════════
  // ✅ Fetch ALL active places (NO SQL filter — filter in JS)
  // ═══════════════════════════════════════════════════════════
  const places = await Place.findAll({
    where: { isActive: true },
    limit: 500,
  });

  console.log(`📦 [getNearbyPlaces] Fetched ${places.length} places from DB`);

  // ═══════════════════════════════════════════════════════════
  // Compute distance + tier
  // ═══════════════════════════════════════════════════════════
  const withTier = places.map((p) => {
    const pJson = p.toJSON();

    let distance = null;
    const pLat = pJson.latitude != null ? parseFloat(pJson.latitude) : null;
    const pLng = pJson.longitude != null ? parseFloat(pJson.longitude) : null;

    if (hasCoords && pLat != null && pLng != null) {
      distance = haversineDistance(latNum, lngNum, pLat, pLng);
    }

    const tier = computeTier(
      pJson,
      { normCity, normDistrict },
      distance,
      safeRadius
    );

    return {
      ...pJson,
      distance,
      tier,
      tierPriority: tierToPriority(tier),
    };
  });

  // ═══════════════════════════════════════════════════════════
  // Debug: show tier counts
  // ═══════════════════════════════════════════════════════════
  const counts = {
    SAME_CITY: withTier.filter((p) => p.tier === "SAME_CITY").length,
    NEARBY: withTier.filter((p) => p.tier === "NEARBY").length,
    SAME_DISTRICT: withTier.filter((p) => p.tier === "SAME_DISTRICT").length,
    OTHER: withTier.filter((p) => p.tier === "OTHER").length,
  };
  console.log("🎯 [getNearbyPlaces] Tier counts:", counts);

  // ═══════════════════════════════════════════════════════════
  // Debug: log first few places with their tier
  // ═══════════════════════════════════════════════════════════
  console.log(
    "🎯 [getNearbyPlaces] Sample:",
    withTier.slice(0, 8).map((p) => ({
      name: p.name,
      city: p.city,
      district: p.district,
      distance: p.distance?.toFixed(1),
      tier: p.tier,
    }))
  );

  // ═══════════════════════════════════════════════════════════
  // ✅ NO FILTER — return all 4 tiers, mobile will group
  // ═══════════════════════════════════════════════════════════
  withTier.sort((a, b) => {
    if (a.tierPriority !== b.tierPriority) {
      return a.tierPriority - b.tierPriority;
    }
    const da = a.distance ?? Infinity;
    const db = b.distance ?? Infinity;
    if (da !== db) return da - db;
    return (b.rating || 0) - (a.rating || 0);
  });

  return withTier.slice(0, safeLimit);
};

// ═══════════════════════════════════════════════════════════════
// GET ALL PLACES (basic filter — used by admin / list screens)
// ═══════════════════════════════════════════════════════════════
export const getAllPlaces = async ({
  city,
  category,
  page = 1,
  limit = 10,
  includeInactive = false,
} = {}) => {
  const where = {};
  if (city) where.city = { [Op.iLike]: `%${city}%` };
  if (category) where.category = category;
  if (!includeInactive) where.isActive = true;

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
  if (!q || !q.trim()) throw new Error("Search query is required");

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
  if (city) where.city = { [Op.iLike]: `%${city}%` };
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
// GALLERY
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