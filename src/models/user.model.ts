import { z } from "zod";

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

export const ChangeProfileSchema = z.object({
  name: z.string().max(70, {
    message: "Your name can not be more than 70 characters.",
  }),
  bio: z.string().max(160, {
    message: "Your bio can not be more than 160 characters.",
  }),
  image: z.string(),
});
