import { ApiResponse } from "../../utils/apiResponse.js";

import {
  fetchPhotographers,
  fetchPhotographer,
  changePhotographerStatus,
  removePhotographer,
} from "./adminPhotographer.service.js";

export const getPhotographers =
  async (req, res, next) => {
    try {
      const photographers =
        await fetchPhotographers();

      return ApiResponse.success(
        res,
        "Photographers fetched successfully",
        photographers
      );
    } catch (error) {
      next(error);
    }
  };

export const getPhotographer =
  async (req, res, next) => {
    try {
      const photographer =
        await fetchPhotographer(
          req.params.id
        );

      return ApiResponse.success(
        res,
        "Photographer fetched successfully",
        photographer
      );
    } catch (error) {
      next(error);
    }
  };

export const updatePhotographerStatus =
  async (req, res, next) => {
    try {
      const photographer =
        await changePhotographerStatus(
          req.params.id,
          req.body.isActive
        );

      return ApiResponse.success(
        res,
        "Photographer status updated successfully",
        photographer
      );
    } catch (error) {
      next(error);
    }
  };

export const deletePhotographer =
  async (req, res, next) => {
    try {
      const result =
        await removePhotographer(
          req.params.id
        );

      return ApiResponse.success(
        res,
        result.message,
        null
      );
    } catch (error) {
      next(error);
    }
  };