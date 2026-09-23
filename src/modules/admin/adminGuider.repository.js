// src/modules/admin/adminGuider.repository.js
import Guider from "../../database/models/core/Guider.js";
import User from "../../database/models/core/User.js";

// ═══════════════════════════════════════════
// ✅ FIX: Include User — email/phone/name sab ek query me
// ═══════════════════════════════════════════
export const getAllGuiders = async () => {
  return await Guider.findAll({
    include: [
      {
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'role', 'isActive'],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

export const getGuiderById = async (id) => {
  return await Guider.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'role', 'isActive'],
      },
    ],
  });
};

export const updateGuiderStatus = async (id, isActive) => {
  const guider = await Guider.findByPk(id);
  if (!guider) return null;
  await guider.update({ isActive });
  return guider;
};

export const deleteGuiderById = async (id) => {
  const guider = await Guider.findByPk(id);
  if (!guider) return null;
  await guider.destroy();
  return true;
};