import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { SignUpSchema } from "../models/user.model";

const prisma = new PrismaClient();

async function signUp(req: Request, res: Response) {
  const user = SignUpSchema.safeParse(req.body);
  if (!user.success) {
    res.status(400).send(user.error);
    return;
  }
  const hasUser = await prisma.user.findFirst({
    where: {
      username: user.data.username,
      email: user.data.email,
    },
  });

  if (hasUser) {
    res.status(400).send({ error: "User is already signed up" });
    return;
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(user.data.password, salt);

  await prisma.user.create({
    data: {
      username: user.data.username,
      email: user.data.email,
      password: hashedPassword,
    },
  });
  res.status(200).send({ message: "User has been created" });
}

export default {
  signUp,
};
