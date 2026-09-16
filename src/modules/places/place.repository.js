import { Op } from "sequelize";
import Place from "../../database/models/core/Place.js";

export const createPlace = async (payload) => {
  return await Place.create(payload);
};

export const getAllPlaces = async ({ city, category, page = 1, limit = 10 }) => {
  const where = {};
  if (city) where.city = city;
  if (category) where.category = category;

  return await Place.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [["createdAt", "DESC"]],
  });
};

export const getPlaceById = async (id) => {
  return await Place.findByPk(id);
};

export const getFeatured = async () => {
  return await Place.findAll({
    where: { isFeatured: true, isActive: true },
    limit: 5,
  });
};

export const searchPlaces = async (q, city) => {
  const where = {
    [Op.or]: [
      { name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } },
      { category: { [Op.iLike]: `%${q}%` } },
    ],
  };
  if (city) where.city = city;
  return await Place.findAll({ where });
};

export const updatePlaceById = async (id, payload) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.update(payload);
  return place;
};

export const deletePlaceById = async (id) => {
  const place = await Place.findByPk(id);
  if (!place) return null;
  await place.destroy();
  return true;
};