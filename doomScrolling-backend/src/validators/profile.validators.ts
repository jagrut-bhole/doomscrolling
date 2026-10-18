import { z } from "zod";
import { emailRegex } from "@/constants/user.constants";

export const profileUpdateSchema = z.object({
  currentEmail: z.string().trim().regex(emailRegex, {
    message: "Invalid email address format",
  }),
  newEmail: z.string().trim().regex(emailRegex, {
    message: "Invalid email address format",
  }),
  password: z.string().min(5, "Password must be at least 5 characters")
});

export type profileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const userPasswordChangeSchema = z.object({
  currentPassword: z.string().min(5, "Password must be at least 5 characters"),
  newPassword: z.string().min(5, "Password must be at least 5 characters"),
});

export type userPasswordChangeInput = z.infer<typeof userPasswordChangeSchema>