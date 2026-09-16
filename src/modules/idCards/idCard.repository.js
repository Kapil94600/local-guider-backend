// src/modules/idCards/idCard.repository.js
import IdCard from "../../database/models/core/IdCard.js";
import Place from "../../database/models/core/Place.js";
import Guider from "../../database/models/core/Guider.js";
import Photographer from "../../database/models/core/Photographer.js";

const getPlaceNames = async (placeIds) => {
  if (!placeIds || placeIds.length === 0) return [];
  try {
    const places = await Place.findAll({
      where: { id: placeIds },
      attributes: ["id", "name"],
    });
    return places.map(p => p.name);
  } catch {
    return [];
  }
};

const enrichIdCard = async (card) => {
  const json = card.toJSON();
  let placeNames = json.placeNames || [];
  let location = json.location;

  if (!placeNames.length && json.placeIds?.length) {
    placeNames = await getPlaceNames(json.placeIds);
  }

  if (!location) {
    const profile = json.role === 'GUIDER'
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

export const findIdCardByUserId = async (userId) => {
  const card = await IdCard.findOne({ where: { userId } });
  if (card) return enrichIdCard(card);
  return null;
};

// ✅ Added
export const getIdCardByIdRepository = async (id) => {
  const card = await IdCard.findByPk(id);
  if (!card) return null;
  return enrichIdCard(card);
};

export const getAllIdCards = async ({ page = 1, limit = 10 } = {}) => {
  const result = await IdCard.findAndCountAll({
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  const enrichedRows = await Promise.all(
    result.rows.map(async (card) => {
      let location = card.location;
      let placeIds = card.placeIds || [];
      let placeNames = card.placeNames || [];

      if (!location || !placeNames.length) {
        const profile = card.role === 'GUIDER'
          ? await Guider.findOne({ where: { userId: card.userId } })
          : await Photographer.findOne({ where: { userId: card.userId } });

        if (profile) {
          if (!location) location = profile.location || null;
          if (!placeNames.length) {
            const profilePlaceIds = profile.placeIds || [];
            if (profilePlaceIds.length) {
              placeIds = profilePlaceIds;
              placeNames = await getPlaceNames(profilePlaceIds);
            }
          }
        }
      }

      if (!placeNames.length && placeIds.length) {
        placeNames = await getPlaceNames(placeIds);
      }

      return {
        ...card.toJSON(),
        location: location || "N/A",
        placeNames,
        placeIds,
      };
    })
  );

  return { rows: enrichedRows, count: result.count };
};

export const revokeIdCardById = async (id) => {
  const card = await IdCard.findByPk(id);
  if (!card) return null;
  await card.update({ status: "REVOKED" });
  return enrichIdCard(card);
};

export const createIdCard = async (data) => {
  const card = await IdCard.create(data);
  return enrichIdCard(card);
};