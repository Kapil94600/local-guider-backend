import {
  getActiveOffers,
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
} from "./offer.repository.js";

export const fetchActiveOffers = async () => {
  return await getActiveOffers();
};

export const fetchAllOffers = async () => {
  return await getAllOffers();
};

export const fetchOffer = async (id) => {
  const offer = await getOfferById(id);
  if (!offer) throw new Error("Offer not found");
  return offer;
};

export const addOffer = async (data) => {
  return await createOffer(data);
};

export const editOffer = async (id, data) => {
  const offer = await updateOffer(id, data);
  if (!offer) throw new Error("Offer not found");
  return offer;
};

export const removeOffer = async (id) => {
  const result = await deleteOffer(id);
  if (!result) throw new Error("Offer not found");
  return { message: "Offer deleted successfully" };
};