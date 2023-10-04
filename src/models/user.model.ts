import { z } from "zod";

export const SignUpSchema = z.object({
  username: z
    .string({
      required_error: "Username is required",
    })
    .min(8, { message: "Username must be at least 8 characters" }),
  password: z
    .string({
      required_error: "Password is required",
    })
    .min(8, { message: "Password must be at least 8 characters" }),
  email: z
    .string({
      required_error: "Email is required",
    })
    .email({ message: "This is invalid email" }),
});

export const LogInSchema = z.object({
  username: z.string({
    required_error: "Username is required",
  }),
  password: z.string({
    required_error: "Password is required",
  }),
});

export const CookiesSchema = z.object({
  refreshToken: z.string(),
});

export const ChangeEmailSchema = z.object({
  password: z.string().nonempty({ message: "This field can not be empty" }),
  newEmail: z.string().email({ message: "This is an invalid email" }),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .nonempty({ message: "This field can not be empty" }),
  newPassword: z.string().nonempty({ message: "This field can not be empty" }),
});
