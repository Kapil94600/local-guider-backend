// src/modules/favorites/favorite.routes.js
import express from "express";
import { createFavorite, getFavorites, removeFavorite } from "./favorite.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, createFavorite);
// ✅ FIX: no :userId param — user's own favorites fetched from token
router.get("/", authenticate, getFavorites);
router.delete("/:id", authenticate, removeFavorite);

export default router;