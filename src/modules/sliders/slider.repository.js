import Slider from "../../database/models/core/Slider.js";

// ✅ Sanitize empty strings to null/default
const sanitizeSliderData = (data) => {
  return {
    ...data,
    // Empty string -> null (for linkId)
    linkId: data.linkId === '' || data.linkId === undefined ? null : data.linkId,
    // Empty string -> 0 (for order)
    order: data.order === '' || data.order === undefined ? 0 : Number(data.order),
    // Ensure linkType is valid
    linkType: data.linkType || 'NONE',
    // Ensure isActive is boolean
    isActive: data.isActive ?? true,
  };
};

export const getAllSliders = async () => {
  return await Slider.findAll({ order: [["order", "ASC"]] });
};

export const getActiveSliders = async () => {
  return await Slider.findAll({ where: { isActive: true }, order: [["order", "ASC"]] });
};

export const getSliderById = async (id) => {
  return await Slider.findByPk(id);
};

export const createSlider = async (data) => {
  const clean = sanitizeSliderData(data);
  return await Slider.create(clean);
};

export const updateSlider = async (id, data) => {
  const slider = await Slider.findByPk(id);
  if (!slider) return null;
  const clean = sanitizeSliderData(data);
  await slider.update(clean);
  return slider;
};

export const deleteSlider = async (id) => {
  const slider = await Slider.findByPk(id);
  if (!slider) return null;
  await slider.destroy();
  return true;
};