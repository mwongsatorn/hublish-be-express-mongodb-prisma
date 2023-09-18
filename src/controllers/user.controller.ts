import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { SignUpSchema, LogInSchema } from "../models/user.model";

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

async function logIn(req: Request, res: Response) {
  const user = LogInSchema.safeParse(req.body);
  if (!user.success) {
    res.status(401).send(user.error);
    return;
  }
  const hasUser = await prisma.user.findFirst({
    where: {
      username: user.data.username,
    },
  });

  if (!hasUser) {
    res.status(401).send({ message: "This user does not exist" });
    return;
  }

  const isSamePassword = await bcrypt.compare(
    user.data.password,
    hasUser.password
  );

  if (!isSamePassword) {
    res.status(401).send({ message: "Username or password is incorrect" });
    return;
  }

  const token = jwt.sign(
    { username: hasUser.username },
    process.env.JWT_SECRETKEY!
  );
  res.status(200).send({ token: token });
}

export default {
  signUp,
  logIn,
};
