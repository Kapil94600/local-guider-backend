import Photographer from "../../database/models/core/Photographer.js";

export const getAllPhotographers = async () => {
  return await Photographer.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const getPhotographerById = async (
  id
) => {
  return await Photographer.findByPk(id);
};

export const updatePhotographerStatus =
  async (id, isActive) => {
    const photographer =
      await Photographer.findByPk(id);

    if (!photographer) {
      return null;
    }

    await photographer.update({
      isActive,
    });

    return photographer;
  };

export const deletePhotographerById =
  async (id) => {
    const photographer =
      await Photographer.findByPk(id);

    if (!photographer) {
      return null;
    }

    await photographer.destroy();

    return true;
  };