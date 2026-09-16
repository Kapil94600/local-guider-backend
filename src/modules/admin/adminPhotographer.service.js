import {
  getAllPhotographers,
  getPhotographerById,
  updatePhotographerStatus,
  deletePhotographerById,
} from "./adminPhotographer.repository.js";

export const fetchPhotographers =
  async () => {
    return await getAllPhotographers();
  };

export const fetchPhotographer =
  async (id) => {
    const photographer =
      await getPhotographerById(id);

    if (!photographer) {
      throw new Error(
        "Photographer not found"
      );
    }

    return photographer;
  };

export const changePhotographerStatus =
  async (id, isActive) => {
    if (
      typeof isActive !== "boolean"
    ) {
      throw new Error(
        "isActive must be true or false"
      );
    }

    const photographer =
      await updatePhotographerStatus(
        id,
        isActive
      );

    if (!photographer) {
      throw new Error(
        "Photographer not found"
      );
    }

    return photographer;
  };

export const removePhotographer =
  async (id) => {
    const result =
      await deletePhotographerById(id);

    if (!result) {
      throw new Error(
        "Photographer not found"
      );
    }

    return {
      message:
        "Photographer deleted successfully",
    };
  };