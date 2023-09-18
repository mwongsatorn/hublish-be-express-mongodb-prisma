import { z } from "zod";

const UserSchema = z.object({
  username: z
    .string()
    .min(8, { message: "Username must be at least 8 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
  email: z.string().email({ message: "This is invalid email" }),
  bio: z.string(),
  image: z.string(),
});

export default UserSchema;
export type User = z.infer<typeof UserSchema>;
