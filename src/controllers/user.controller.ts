import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { SignUpSchema, LogInSchema, CookiesSchema } from "../models/user.model";

const prisma = new PrismaClient();

async function signUp(req: Request, res: Response) {
  const user = SignUpSchema.safeParse(req.body);
  if (!user.success) {
    res.sendStatus(400);
    return;
  }
  const foundUser = await prisma.user.findFirst({
    where: {
      username: user.data.username,
      email: user.data.email,
    },
  });

  if (foundUser) {
    res.status(200).send({ error: "User is already signed up" });
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
  res.sendStatus(201);
}

async function logIn(req: Request, res: Response) {
  const user = LogInSchema.safeParse(req.body);
  if (!user.success) {
    res.sendStatus(400);
    return;
  }
  const foundUser = await prisma.user.findFirst({
    where: {
      username: user.data.username,
    },
  });

  if (!foundUser) {
    res.sendStatus(401);
    return;
  }

  const isSamePassword = await bcrypt.compare(
    user.data.password,
    foundUser.password
  );

  if (!isSamePassword) {
    res.sendStatus(401);
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
    res.sendStatus(400);
    return;
  }
  res.status(200).send({
    profile: {
      username: foundUser.username,
      name: foundUser.name,
      email: foundUser.email,
      bio: foundUser.bio,
    },
  });
}

interface UserPayload extends jwt.JwtPayload {
  username: string;
}

function refreshAccessToken(req: Request, res: Response) {
  try {
    const validateCookies = CookiesSchema.safeParse(req.cookies);

    if (!validateCookies.success) return res.sendStatus(401);

    const { refreshToken } = validateCookies.data;
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_KEY!
    ) as UserPayload;
    const accessToken = jwt.sign(
      { username: decoded.username },
      process.env.ACCESS_TOKEN_KEY!
    );
    res.status(200).send({ accessToken: accessToken });
  } catch (e) {
    res.sendStatus(403);
  }
}

async function logOut(req: Request, res: Response) {
  try {
    const validateCookies = CookiesSchema.safeParse(req.cookies);

    if (!validateCookies.success) return res.sendStatus(401);

    const { refreshToken } = validateCookies.data;
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_KEY!
    ) as UserPayload;

    const foundUser = await prisma.user.update({
      where: {
        username: decoded.username,
      },
      data: {
        refreshToken: "",
      },
    });

    if (!foundUser) res.sendStatus(401);
    res.clearCookie("refreshToken");
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(403);
  }
}

export default {
  signUp,
  logIn,
  profile,
  refreshAccessToken,
  logOut,
};
