import {
  createPhotographer,
  getAllPhotographers,
  getPhotographerById,
  getPhotographerByUserId,
  updatePhotographerById,
  deletePhotographerById,
  getPhotographerPlaces,
  // ✅ Gallery
  addGalleryImage,
  removeGalleryImage,
  replaceGallery,
} from "./photographer.repository.js";

export const addPhotographer = async (payload) => {
  return await createPhotographer(payload);
};

export const fetchPhotographers = async (params = {}) => {
  return await getAllPhotographers(params);
};

export const fetchPhotographerById = async (id) => {
  const photographer = await getPhotographerById(id);
  if (!photographer) throw new Error("Photographer not found");
  return photographer;
};

export const fetchPhotographerByUserId = async (userId) => {
  return await getPhotographerByUserId(userId);
};

export const updatePhotographer = async (id, payload) => {
  const photographer = await updatePhotographerById(id, payload);
  if (!photographer) throw new Error("Photographer not found");
  return photographer;
};

export const removePhotographer = async (id) => {
  const result = await deletePhotographerById(id);
  if (!result) throw new Error("Photographer not found");
  return { message: "Photographer deleted successfully" };
};

export const fetchPhotographerPlaces = async (photographerId) => {
  return await getPhotographerPlaces(photographerId);
};

// ✅ Gallery Service
export const addGallery = async (photographerId, imageUrl) => {
  const photographer = await addGalleryImage(photographerId, imageUrl);
  if (!photographer) throw new Error("Photographer not found");
  return photographer;
};

export const removeGallery = async (photographerId, imageUrl) => {
  const photographer = await removeGalleryImage(photographerId, imageUrl);
  if (!photographer) throw new Error("Photographer not found");
  return photographer;
};

export const updateGallery = async (photographerId, images) => {
  const photographer = await replaceGallery(photographerId, images);
  if (!photographer) throw new Error("Photographer not found");
  return photographer;
};