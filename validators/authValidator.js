const { z } = require('zod');

const signupSchema = z.object({
  userName: z.string().min(3,"Username must be at least 3 characters"),
  email:    z.email("Invalid email format"),
  password: z.string().min(6,"Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email:    z.email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});

module.exports = { signupSchema, loginSchema, refreshSchema };