// src/modules/idCards/idCard.repository.js
import { Op } from "sequelize";
import IdCard from "../../database/models/core/IdCard.js";
import Place from "../../database/models/core/Place.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";

// ═══════════════════════════════════════════════════════════════
// ✅ HELPER: Batch fetch place names (avoid N+1)
// ═══════════════════════════════════════════════════════════════
const getPlaceNamesMap = async (allPlaceIds) => {
  if (!allPlaceIds || allPlaceIds.length === 0) return new Map();

  try {
    const places = await Place.findAll({
      where: { id: { [Op.in]: allPlaceIds } },
      attributes: ["id", "name"],
    });
    return new Map(places.map((p) => [p.id, p.name]));
  } catch {
    return new Map();
  }
};

// ═══════════════════════════════════════════════════════════════
// ✅ HELPER: Batch fetch profiles (avoid N+1)
// ═══════════════════════════════════════════════════════════════
const getProfilesMap = async (cards) => {
  const guiderUserIds = [];
  const photographerUserIds = [];

  for (const card of cards) {
    if (card.role === "GUIDER") guiderUserIds.push(card.userId);
    else if (card.role === "PHOTOGRAPHER") photographerUserIds.push(card.userId);
  }

  const [guiders, photographers] = await Promise.all([
    guiderUserIds.length > 0
      ? Guider.findAll({
          where: { userId: { [Op.in]: guiderUserIds } },
          attributes: ["userId", "location", "placeIds"],
        })
      : [],
    photographerUserIds.length > 0
      ? Photographer.findAll({
          where: { userId: { [Op.in]: photographerUserIds } },
          attributes: ["userId", "location", "placeIds"],
        })
      : [],
  ]);

  const map = new Map();
  for (const g of guiders) map.set(g.userId, g);
  for (const p of photographers) map.set(p.userId, p);
  return map;
};

// ═══════════════════════════════════════════════════════════════
// ENRICH single ID card
// ═══════════════════════════════════════════════════════════════
const enrichIdCard = async (card) => {
  const json = card.toJSON();
  let placeNames = json.placeNames || [];
  let location = json.location;

  if (!placeNames.length && json.placeIds?.length) {
    const places = await Place.findAll({
      where: { id: json.placeIds },
      attributes: ["id", "name"],
    });
    placeNames = places.map((p) => p.name);
  }

  if (!location) {
    const profile =
      json.role === "GUIDER"
        ? await Guider.findOne({ where: { userId: json.userId } })
        : await Photographer.findOne({ where: { userId: json.userId } });
    if (profile) location = profile.location || null;
  }

  return {
    ...json,
    location: location || "N/A",
    placeNames,
  };
};

// ═══════════════════════════════════════════════════════════════
// FIND by userId
// ═══════════════════════════════════════════════════════════════
export const findIdCardByUserId = async (userId) => {
  const card = await IdCard.findOne({ where: { userId } });
  if (card) return enrichIdCard(card);
  return null;
};

// ═══════════════════════════════════════════════════════════════
// FIND by ID
// ═══════════════════════════════════════════════════════════════
export const getIdCardByIdRepository = async (id) => {
  const card = await IdCard.findByPk(id);
  if (!card) return null;
  return enrichIdCard(card);
};

// ═══════════════════════════════════════════════════════════════
// ✅ FIX: getAllIdCards — Batch fetch (NO N+1)
// ═══════════════════════════════════════════════════════════════
export const getAllIdCards = async ({ page = 1, limit = 10 } = {}) => {
  const result = await IdCard.findAndCountAll({
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  const cards = result.rows;
  if (cards.length === 0) {
    return { rows: [], count: 0 };
  }

  // ✅ Step 1: Collect all placeIds from cards + their profiles
  const cardsNeedingProfile = cards.filter(
    (c) => !c.location || !(c.placeIds || []).length
  );

  // ✅ Step 2: Batch fetch profiles
  const profilesMap = await getProfilesMap(cardsNeedingProfile);

  // ✅ Step 3: Collect all placeIds
  const allPlaceIds = new Set();
  for (const card of cards) {
    const cardPlaceIds = card.placeIds || [];
    if (cardPlaceIds.length > 0) {
      cardPlaceIds.forEach((id) => allPlaceIds.add(String(id)));
    } else {
      const profile = profilesMap.get(card.userId);
      if (profile?.placeIds) {
        profile.placeIds.forEach((id) => allPlaceIds.add(String(id)));
      }
    }
  }

  // ✅ Step 4: Batch fetch place names
  const placeNamesMap = await getPlaceNamesMap(Array.from(allPlaceIds));

  // ✅ Step 5: Enrich all cards (no more DB queries)
  const enrichedRows = cards.map((card) => {
    let location = card.location;
    let placeIds = card.placeIds || [];
    let placeNames = card.placeNames || [];

    // Fill from profile if needed
    if (!location || !placeNames.length) {
      const profile = profilesMap.get(card.userId);
      if (profile) {
        if (!location) location = profile.location || null;
        if (!placeNames.length) {
          const profilePlaceIds = profile.placeIds || [];
          if (profilePlaceIds.length) {
            placeIds = profilePlaceIds;
          }
        }
      }
    }

    // Map place names from cache
    if (placeIds.length > 0) {
      placeNames = placeIds.map((id) => placeNamesMap.get(String(id))).filter(Boolean);
    }

    return {
      ...card.toJSON(),
      location: location || "N/A",
      placeNames,
      placeIds,
    };
  });

  return { rows: enrichedRows, count: result.count };
};

// ═══════════════════════════════════════════════════════════════
// REVOKE
// ═══════════════════════════════════════════════════════════════
export const revokeIdCardById = async (id) => {
  const card = await IdCard.findByPk(id);
  if (!card) return null;
  await card.update({ status: "REVOKED" });
  return enrichIdCard(card);
};

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export const createIdCard = async (data) => {
  const card = await IdCard.create(data);
  return enrichIdCard(card);
};