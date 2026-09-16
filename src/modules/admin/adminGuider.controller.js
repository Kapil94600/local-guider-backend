import { ApiResponse } from "../../utils/apiResponse.js";

import {
  fetchGuiders,
  fetchGuider,
  changeGuiderStatus,
  removeGuider,
} from "./adminGuider.service.js";

export const getGuiders = async (
  req,
  res,
  next
) => {
  try {
    const guiders =
      await fetchGuiders();

    return ApiResponse.success(
      res,
      "Guiders fetched successfully",
      guiders
    );
  } catch (error) {
    next(error);
  }
};

export const getGuider = async (
  req,
  res,
  next
) => {
  try {
    const guider =
      await fetchGuider(
        req.params.id
      );

    return ApiResponse.success(
      res,
      "Guider fetched successfully",
      guider
    );
  } catch (error) {
    next(error);
  }
};

export const updateGuiderStatus =
  async (req, res, next) => {
    try {
      const guider =
        await changeGuiderStatus(
          req.params.id,
          req.body.isActive
        );

      return ApiResponse.success(
        res,
        "Guider status updated successfully",
        guider
      );
    } catch (error) {
      next(error);
    }
  };

export const deleteGuider =
  async (req, res, next) => {
    try {
      const result =
        await removeGuider(
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