import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Use a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetSchema = z.object({
  email: z.string().email("Use a valid email address"),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your new password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
export type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;
