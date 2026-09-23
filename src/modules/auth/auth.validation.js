import { body } from "express-validator";

export const registerValidation = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required"),

  body("email")
    .isEmail()
    .withMessage("Valid email required"),

  body("phone")
    .notEmpty()
    .withMessage("Phone is required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password minimum 6 characters"),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email required"),

  body("password")
    .notEmpty()
    .withMessage("Password required"),
];