// src/modules/admin/adminPhotographer.repository.js
import Photographer from "../../database/models/core/Photographer.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════
// ✅ FIX: Include User — email/phone/name sab ek query me
// ═══════════════════════════════════════════
export const getAllPhotographers = async () => {
  return await Photographer.findAll({
    include: [
      {
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'role', 'isActive'],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

export const getPhotographerById = async (id) => {
  return await Photographer.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'role', 'isActive'],
      },
    ],
  });
};

export const updatePhotographerStatus = async (id, isActive) => {
  const photographer = await Photographer.findByPk(id);
  if (!photographer) return null;
  await photographer.update({ isActive });
  return photographer;
};

export const deletePhotographerById = async (id) => {
  const photographer = await Photographer.findByPk(id);
  if (!photographer) return null;
  await photographer.destroy();
  return true;
};