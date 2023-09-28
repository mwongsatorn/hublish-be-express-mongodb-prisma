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
    res.status(400).send({ status: false, error: "Bad request" });
    return;
  }
  const foundUser = await prisma.user.findFirst({
    where: {
      username: user.data.username,
      email: user.data.email,
    },
  });

  if (foundUser) {
    res
      .status(200)
      .send({ success: false, error: "User is already signed up" });
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
  res.status(201).send({ status: true, message: "Sign up successfully" });
}

async function logIn(req: Request, res: Response) {
  const user = LogInSchema.safeParse(req.body);
  if (!user.success) {
    res.status(401).send(user.error);
    return;
  }
  const foundUser = await prisma.user.findFirst({
    where: {
      username: user.data.username,
    },
  });

  if (!foundUser) {
    res.status(401).send({ status: false, error: "This user does not exist" });
    return;
  }

  const isSamePassword = await bcrypt.compare(
    user.data.password,
    foundUser.password
  );

  if (!isSamePassword) {
    res
      .status(401)
      .send({ status: false, error: "Username or password is incorrect" });
    return;
  }

  const accessToken = jwt.sign(
    { username: foundUser.username },
    process.env.ACCESS_TOKEN_KEY!,
    { expiresIn: "1m" }
  );

  const refreshToken = jwt.sign(
    { username: foundUser.username },
    process.env.REFRESH_TOKEN_KEY!,
    { expiresIn: "1days" }
  );

  await prisma.user.update({
    where: {
      username: foundUser.username,
    },
    data: {
      refreshToken: refreshToken,
    },
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "lax",
    path: "/",
  });

  res.status(200).send({
    status: true,
    user: {
      username: foundUser.username,
      email: foundUser.email,
      bio: foundUser.bio,
      name: foundUser.name,
      accessToken: accessToken,
    },
  });
}

interface UserRequest extends Request {
  username: string;
}

async function profile(req: Request, res: Response) {
  const { username } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      username: username,
    },
  });
  if (!foundUser) {
    res.status(400).send({ status: false, error: "Something went wrong." });
    return;
  }
  res.status(200).send({
    status: true,
    profile: {
      username: foundUser.username,
      name: foundUser.name,
      email: foundUser.email,
      bio: foundUser.bio,
    },
  });
}

export default {
  signUp,
  logIn,
  profile,
};
