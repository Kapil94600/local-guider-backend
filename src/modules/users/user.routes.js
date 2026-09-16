import express from "express";

import {
  profile,
  updateUserProfile,
  changeUserPassword,
  updateProfileImage,
} from "./user.controller.js";

import { authenticate } from "../../middlewares/authMiddleware.js";

import { upload } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get(
  "/profile",
  authenticate,
  profile
);

router.put(
  "/profile",
  authenticate,
  updateUserProfile
);

router.put(
  "/change-password",
  authenticate,
  changeUserPassword
);

router.put(
  "/profile-image",
  authenticate,
  upload.single("image"),
  updateProfileImage
);

export default router;