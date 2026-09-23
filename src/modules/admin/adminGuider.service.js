import {
  getAllGuiders,
  getGuiderById,
  updateGuiderStatus,
  deleteGuiderById,
} from "./adminGuider.repository.js";

export const fetchGuiders = async () => {
  return await getAllGuiders();
};

export const fetchGuider = async (
  id
) => {
  const guider =
    await getGuiderById(id);

  if (!guider) {
    throw new Error(
      "Guider not found"
    );
  }

  return guider;
};

export const changeGuiderStatus =
  async (id, isActive) => {
    if (
      typeof isActive !== "boolean"
    ) {
      throw new Error(
        "isActive must be true or false"
      );
    }

    const guider =
      await updateGuiderStatus(
        id,
        isActive
      );

    if (!guider) {
      throw new Error(
        "Guider not found"
      );
    }

    return guider;
  };

export const removeGuider =
  async (id) => {
    const result =
      await deleteGuiderById(id);

    if (!result) {
      throw new Error(
        "Guider not found"
      );
    }

    return {
      message:
        "Guider deleted successfully",
    };
  };