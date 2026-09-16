import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export const generateAccessToken = (
  user
) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn:
        env.JWT_ACCESS_EXPIRES || "1d",
    }
  );
};

export const generateRefreshToken = (
  user
) => {
  return jwt.sign(
    {
      id: user.id,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn:
        env.JWT_REFRESH_EXPIRES || "30d",
    }
  );
};

export const verifyRefreshToken = (
  token
) => {
  return jwt.verify(
    token,
    env.JWT_REFRESH_SECRET
  );
};