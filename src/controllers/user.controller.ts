import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  SignUpSchema,
  LogInSchema,
  CookiesSchema,
  ChangeEmailSchema,
  ChangePasswordSchema,
  ChangeProfileSchema,
} from "../models/user.model";

const prisma = new PrismaClient();

async function signUp(req: Request, res: Response) {
  const user = SignUpSchema.safeParse(req.body);
  if (!user.success) return res.sendStatus(400);

  const foundUser = await prisma.user.findFirst({
    where: {
      username: user.data.username,
      email: user.data.email,
    },
  });

  if (foundUser)
    return res.status(200).send({ error: "User is already signed up" });

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
    { id: foundUser.id },
    process.env.ACCESS_TOKEN_KEY!,
    { expiresIn: "1m" }
  );

  const refreshToken = jwt.sign(
    { id: foundUser.id },
    process.env.REFRESH_TOKEN_KEY!,
    { expiresIn: "1days" }
  );

  await prisma.user.update({
    where: {
      id: foundUser.id,
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
  id: string;
}

async function profile(req: Request, res: Response) {
  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      id: id,
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
  id: string;
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
      { id: decoded.id },
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
        id: decoded.id,
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

async function changeEmail(req: Request, res: Response) {
  const validateBody = ChangeEmailSchema.safeParse(req.body);
  if (!validateBody.success) return res.sendStatus(400);
  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      id: id,
    },
  });

  if (!foundUser) return res.sendStatus(400);

  const isSamePassword = await bcrypt.compare(
    validateBody.data.password,
    foundUser.password
  );

  if (!isSamePassword) return res.sendStatus(401);

  const isUsedEmail = await prisma.user.findFirst({
    where: {
      email: validateBody.data.newEmail,
    },
  });

  if (isUsedEmail) return res.sendStatus(409);

  await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      email: validateBody.data.newEmail,
    },
  });

  res.sendStatus(200);
}

async function changePassword(req: Request, res: Response) {
  const validateBody = ChangePasswordSchema.safeParse(req.body);
  if (!validateBody.success) return res.sendStatus(400);
  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      id: id,
    },
  });

  if (!foundUser) return res.sendStatus(404);

  const isSamePassword = await bcrypt.compare(
    validateBody.data.currentPassword,
    foundUser.password
  );
  if (!isSamePassword) return res.sendStatus(401);

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(validateBody.data.newPassword, salt);

  await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      password: hashedPassword,
    },
  });

  res.sendStatus(200);
}

async function changeProfile(req: Request, res: Response) {
  const validateBody = ChangeProfileSchema.safeParse(req.body);
  if (!validateBody.success) return res.sendStatus(400);

  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      id: id,
    },
  });

  if (!foundUser) return res.sendStatus(404);

  await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      ...validateBody.data,
    },
  });

  res.sendStatus(200);
}

export default {
  signUp,
  logIn,
  profile,
  refreshAccessToken,
  logOut,
  changeEmail,
  changePassword,
  changeProfile,
};
