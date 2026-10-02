// src/modules/places/place.repository.js
import { Op, literal } from "sequelize";
import Place from "../../database/models/core/Place.js";

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createPlace = async (payload) => {
  return await Place.create(payload);
};

// ═══════════════════════════════════════════════════════════════
// GET ALL PLACES — basic filter (existing)
// ═══════════════════════════════════════════════════════════════
export const getAllPlaces = async ({
  city,
  category,
  page = 1,
  limit = 10,
  includeInactive = false,
} = {}) => {
  const where = {};
  if (city) where.city = { [Op.iLike]: city };
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
// ✅ NORMALIZE: lowercase + trim for comparison
// ═══════════════════════════════════════════════════════════════
const normalize = (str) => {
  if (!str) return null;
  return String(str).trim().toLowerCase();
};

// ═══════════════════════════════════════════════════════════════
// ✅ FUZZY MATCH: "Fatehpur Shekhawati" ↔ "Fatehpur"
// Checks if one contains the other (bidirectional)
// ═══════════════════════════════════════════════════════════════
const fuzzyMatch = (a, b) => {
  if (!a || !b) return false;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
};

// ═══════════════════════════════════════════════════════════════
// ✅ COMPUTE TIER for a single place
// Priority:
//   1 = SAME_CITY (exact or fuzzy)
//   2 = SAME_DISTRICT
//   3 = NEARBY (within radius)
//   4 = SAME_STATE
//   5 = OTHER
// ═══════════════════════════════════════════════════════════════
const computeTier = (
  place,
  { normCity, normDistrict, normState },
  distance,
  radius = 50
) => {
  // Tier 1: Same City (fuzzy match — "Fatehpur" == "Fatehpur Shekhawati")
  if (normCity && fuzzyMatch(place.city, normCity)) {
    return "SAME_CITY";
  }

  // Tier 2: Same District (fuzzy match)
  if (normDistrict && fuzzyMatch(place.district, normDistrict)) {
    return "SAME_DISTRICT";
  }

  // Tier 3: Nearby (within radius km)
  if (distance != null && distance <= radius) {
    return "NEARBY";
  }

  // Tier 4: Same State
  if (normState && fuzzyMatch(place.state, normState)) {
    return "SAME_STATE";
  }

  // Tier 5: Other
  return "OTHER";
};

// ═══════════════════════════════════════════════════════════════
// ✅ GET NEARBY PLACES — Smart location-based sorting
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
  const normState = state ? String(state).trim() : null;

  // ═══════════════════════════════════════════════════════════
  // FALLBACK: If no valid coordinates, use string-based filter
  // ═══════════════════════════════════════════════════════════
  const latNum = lat != null ? parseFloat(lat) : null;
  const lngNum = lng != null ? parseFloat(lng) : null;
  const hasCoords =
    latNum != null && lngNum != null && !isNaN(latNum) && !isNaN(lngNum);

  if (!hasCoords) {
    // 🔹 No coordinates → use city/district/state OR conditions
    const orConditions = [];
    if (normCity) {
      orConditions.push({ city: { [Op.iLike]: `%${normCity}%` } });
    }
    if (normDistrict) {
      orConditions.push({ district: { [Op.iLike]: `%${normDistrict}%` } });
    }
    if (normState) {
      orConditions.push({ state: { [Op.iLike]: `%${normState}%` } });
    }

    const where = { isActive: true };
    if (orConditions.length > 0) {
      where[Op.or] = orConditions;
    }

    const places = await Place.findAll({
      where,
      limit: safeLimit,
      order: [["rating", "DESC"], ["createdAt", "DESC"]],
    });

    // Assign tiers + sort manually
    const withTier = places.map((p) => {
      const tier = computeTier(
        p.toJSON(),
        { normCity, normDistrict, normState },
        null,
        safeRadius
      );
      return {
        ...p.toJSON(),
        distance: null,
        tier,
        tierPriority: tierToPriority(tier),
      };
    });

    // Sort by tier priority, then by rating
    withTier.sort((a, b) => {
      if (a.tierPriority !== b.tierPriority) {
        return a.tierPriority - b.tierPriority;
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    return withTier;
  }

  // ═══════════════════════════════════════════════════════════
  // Haversine formula for distance (km)
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

  const places = await Place.findAll({
    where: {
      isActive: true,
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
    },
    attributes: {
      include: [[literal(`(${haversine})`), "distance"]],
    },
    limit: safeLimit * 2, // Get more for filtering
    raw: true,
  });

  // ═══════════════════════════════════════════════════════════
  // Compute tier + sort
  // ═══════════════════════════════════════════════════════════
  const withTier = places.map((p) => {
    const distance = p.distance != null ? parseFloat(p.distance) : null;
    const tier = computeTier(
      p,
      { normCity, normDistrict, normState },
      distance,
      safeRadius
    );
    return {
      ...p,
      distance,
      tier,
      tierPriority: tierToPriority(tier),
    };
  });

  // Sort by:
  //   1. Tier priority (SAME_CITY first)
  //   2. Distance (nearest first)
  //   3. Rating (highest first)
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
// HELPER: Tier → numeric priority
// ═══════════════════════════════════════════════════════════════
const tierToPriority = (tier) => {
  switch (tier) {
    case "SAME_CITY":
      return 1;
    case "SAME_DISTRICT":
      return 2;
    case "NEARBY":
      return 3;
    case "SAME_STATE":
      return 4;
    case "OTHER":
    default:
      return 5;
  }
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