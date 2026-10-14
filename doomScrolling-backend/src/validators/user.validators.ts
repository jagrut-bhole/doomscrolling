import { z } from "zod";
import { emailRegex } from "../constants/user.constants";

export const userRegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
  email: z.string().trim().regex(emailRegex, {
    message: "Invalid email address format"
  }),
  password: z.string().min(5, "Password must be at least 5 characters"),
  limit: z.number()
});

export type userRegisterInput = z.infer<typeof userRegisterSchema>

export const userLoginSchema = z.object(({
  email: z.string().trim().regex(emailRegex, {
    message: "Invalid email adderess format"
  }),
  password: z.string().min(5, "Password must be at least 5 characters")
}));

export type userLoginInput = z.infer<typeof userLoginSchema>

export const userPasswordChangeSchema = z.object({
  currentPassword: z.string().min(5, "Password must be at least 5 characters");
  newPassword: z.string().min(5, "Password must be at least 5 characters");
});

export type userPasswordChangeInput = z.infer<typeof userPasswordChangeSchema>