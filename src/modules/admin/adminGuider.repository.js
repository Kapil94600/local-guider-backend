import Guider from "../../database/models/core/Guider.js";

export const getAllGuiders = async () => {
  return await Guider.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const getGuiderById = async (
  id
) => {
  return await Guider.findByPk(id);
};

export const updateGuiderStatus =
  async (id, isActive) => {
    const guider =
      await Guider.findByPk(id);

    if (!guider) {
      return null;
    }

    await guider.update({
      isActive,
    });

    return guider;
  };

export const deleteGuiderById =
  async (id) => {
    const guider =
      await Guider.findByPk(id);

    if (!guider) {
      return null;
    }

    await guider.destroy();

    return true;
  };