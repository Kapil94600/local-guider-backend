// src/modules/idCards/idCard.service.js
import {
  findIdCardByUserId,
  createIdCard,
  getAllIdCards,
  revokeIdCardById,
  getIdCardByIdRepository,   // ✅ Added
} from "./idCard.repository.js";

export const getMyIdCard = async (userId) => {
  const card = await findIdCardByUserId(userId);
  if (!card) throw new Error("ID Card not found");
  return card;
};

export const fetchAllIdCards = async (params = {}) => {
  return await getAllIdCards(params);
};

// ✅ Added
export const fetchIdCardById = async (id) => {
  const card = await getIdCardByIdRepository(id);
  if (!card) throw new Error("ID Card not found");
  return card;
};

export const revokeMyIdCard = async (id) => {
  const card = await revokeIdCardById(id);
  if (!card) throw new Error("ID Card not found");
  return card;
};