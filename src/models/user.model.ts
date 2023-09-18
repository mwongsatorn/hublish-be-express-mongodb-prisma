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
