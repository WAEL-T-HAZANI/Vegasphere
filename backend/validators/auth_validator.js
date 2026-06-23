const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(3).max(50),

  email: z.string().trim().toLowerCase().email(),

  password: z.string().min(8),

  username: z.string().trim().optional().or(z.literal("")),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),

  password: z.string().min(1),

  pin: z.string().trim().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),

  password: z.string().min(8),
});

const setTwoStepSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "PIN must be 4-8 digits"),
});

const disableTwoStepSchema = z.object({
  pin: z
    .union([
      z.string().trim().regex(/^\d{4,8}$/, "PIN must be 4-8 digits"),
      z.literal(""),
    ])
    .optional(),
});

const verifyEmailSchema = z.object({
  token: z.string().trim().min(1),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setTwoStepSchema,
  disableTwoStepSchema,
  verifyEmailSchema,
};
