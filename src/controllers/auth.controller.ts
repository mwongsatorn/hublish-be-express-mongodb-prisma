import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { excludeFields } from "../helpers/excludeFields";
import { SignUpSchema, LogInSchema, CookiesSchema } from "../models/auth.model";

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

  if (foundUser) return res.sendStatus(409);

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(user.data.password, salt);

  const createdUser = await prisma.user.create({
    data: {
      username: user.data.username,
      name: user.data.username,
      email: user.data.email,
      password: hashedPassword,
    },
  });

  const resData = excludeFields(createdUser, ["password", "refreshToken"]);
  res.status(201).send(resData);
}

async function logIn(req: Request, res: Response) {
  const user = LogInSchema.safeParse(req.body);
  if (!user.success)
    return res.status(400).send({ error: "Invalid login input" });
  const foundUser = await prisma.user.findFirst({
    where: {
      username: user.data.username,
    },
  });

  if (!foundUser)
    return res
      .status(401)
      .send({ error: "Username or password is incorrect." });

  const isSamePassword = await bcrypt.compare(
    user.data.password,
    foundUser.password
  );

  if (!isSamePassword)
    return res
      .status(401)
      .send({ error: "Username or password is incorrect." });

  const accessToken = jwt.sign(
    { id: foundUser.id },
    process.env.ACCESS_TOKEN_KEY!,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: foundUser.id },
    process.env.REFRESH_TOKEN_KEY!,
    { expiresIn: "1days" }
  );

  const loggedInUser = await prisma.user.update({
    where: {
      id: foundUser.id,
    },
    data: {
      refreshToken: {
        push: refreshToken,
      },
    },
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "lax",
    path: "/",
  });

  const resData = excludeFields(loggedInUser, ["refreshToken", "password"]);
  res.status(200).send({
    ...resData,
    accessToken: accessToken,
  });
}

interface UserPayload extends jwt.JwtPayload {
  id: string;
}

async function refreshAccessToken(req: Request, res: Response) {
  try {
    const validateCookies = CookiesSchema.safeParse(req.cookies);

    if (!validateCookies.success)
      return res.status(401).send({ error: "Refresh token is required." });

    const { refreshToken } = validateCookies.data;

    const foundUser = await prisma.user.findFirst({
      where: {
        refreshToken: {
          has: refreshToken,
        },
      },
    });

    if (!foundUser) {
      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_KEY!,
        async (err, decoded) => {
          res.clearCookie("refreshToken");
          if (err)
            return res.status(403).send({ error: "Invalid refresh token" });
          await prisma.user.update({
            where: {
              id: (decoded as UserPayload).id,
            },
            data: {
              refreshToken: [],
            },
          });
        }
      );
      return res.status(403).send({ error: "Reuse token detected." });
    }

    foundUser.refreshToken = foundUser.refreshToken.filter(
      (token) => token !== refreshToken
    );

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_KEY!,
      async (err, decoded) => {
        if (err) {
          await prisma.user.update({
            where: {
              id: (decoded as UserPayload).id,
            },
            data: {
              refreshToken: {
                set: foundUser.refreshToken,
              },
            },
          });
          return res.status(401).send({ error: "Refresh token expired" });
        }
      }
    );

    const newAccessToken = jwt.sign(
      { id: foundUser.id },
      process.env.ACCESS_TOKEN_KEY!,
      { expiresIn: "15m" }
    );
    const newRefreshToken = jwt.sign(
      { id: foundUser.id },
      process.env.REFRESH_TOKEN_KEY!,
      { expiresIn: "1day" }
    );

    await prisma.user.update({
      where: {
        id: foundUser.id,
      },
      data: {
        refreshToken: {
          set: [...foundUser.refreshToken, newRefreshToken],
        },
      },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path: "/",
    });

    res.status(200).send({ accessToken: newAccessToken });
  } catch (e) {
    res.status(500).send({ error: "Internal server error." });
  }
}

async function logOut(req: Request, res: Response) {
  const validateCookies = CookiesSchema.safeParse(req.cookies);

  if (!validateCookies.success) return res.sendStatus(204);

  const { refreshToken } = validateCookies.data;

  res.clearCookie("refreshToken");

  const foundUser = await prisma.user.findFirst({
    where: {
      refreshToken: {
        has: refreshToken,
      },
    },
  });

  if (!foundUser) return res.sendStatus(204);

  foundUser.refreshToken = foundUser.refreshToken.filter(
    (token) => token !== refreshToken
  );

  await prisma.user.update({
    where: {
      id: foundUser.id,
    },
    data: {
      refreshToken: {
        set: foundUser.refreshToken,
      },
    },
  });

  return res.sendStatus(204);
}

export default {
  signUp,
  logIn,
  logOut,
  refreshAccessToken,
};
