import { Op } from "sequelize";
import Offer from "../../database/models/core/Offer.js";

export const getActiveOffers = async () => {
  const now = new Date();
  return await Offer.findAll({
    where: {
      isActive: true,
      startDate: { [Op.lte]: now },
      endDate: { [Op.gte]: now },
    },
    order: [["createdAt", "DESC"]],
  });
};

export const getAllOffers = async () => {
  return await Offer.findAll({ order: [["createdAt", "DESC"]] });
};

export const getOfferById = async (id) => {
  return await Offer.findByPk(id);
};

export const createOffer = async (data) => {
  return await Offer.create(data);
};

export const updateOffer = async (id, data) => {
  const offer = await Offer.findByPk(id);
  if (!offer) return null;
  await offer.update(data);
  return offer;
};

export const deleteOffer = async (id) => {
  const offer = await Offer.findByPk(id);
  if (!offer) return null;
  await offer.destroy();
  return true;
};