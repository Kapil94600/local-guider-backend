import {
  getAllSliders,
  getActiveSliders,
  getSliderById,
  createSlider,
  updateSlider,
  deleteSlider,
} from "./slider.repository.js";

export const fetchSliders = async () => {
  return await getAllSliders();
};

export const fetchActiveSliders = async () => {
  return await getActiveSliders();
};

export const fetchSlider = async (id) => {
  const slider = await getSliderById(id);
  if (!slider) throw new Error("Slider not found");
  return slider;
};

export const addSlider = async (data) => {
  return await createSlider(data);
};

export const editSlider = async (id, data) => {
  const slider = await updateSlider(id, data);
  if (!slider) throw new Error("Slider not found");
  return slider;
};

export const removeSlider = async (id) => {
  const result = await deleteSlider(id);
  if (!result) throw new Error("Slider not found");
  return { message: "Slider deleted successfully" };
};