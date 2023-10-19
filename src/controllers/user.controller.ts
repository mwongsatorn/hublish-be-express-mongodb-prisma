import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { excludeFields } from "../helpers/excludeFields";
import {
  ChangeEmailSchema,
  ChangePasswordSchema,
  ChangeProfileSchema,
} from "../models/user.model";

const prisma = new PrismaClient();

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
  if (!foundUser) return res.sendStatus(400);

  const resData = excludeFields(foundUser, ["refreshToken", "password"]);
  console.log(resData);

  res.status(200).send({
    profile: {
      ...resData,
    },
  });
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

  if (!foundUser) return res.sendStatus(404);

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

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      email: validateBody.data.newEmail,
    },
  });

  const resData = excludeFields(updatedUser, ["refreshToken", "password"]);

  res.status(200).send(resData);
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

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      password: hashedPassword,
    },
  });
  const resData = excludeFields(updatedUser, ["refreshToken", "password"]);
  res.status(200).send(resData);
}

async function changeProfile(req: Request, res: Response) {
  const validateBody = ChangeProfileSchema.safeParse(req.body);
  if (!validateBody.success) return res.sendStatus(400);

  const { id } = req as UserRequest;

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      ...validateBody.data,
    },
  });

  if (!updatedUser) return res.sendStatus(404);

  const resData = excludeFields(updatedUser, ["refreshToken", "password"]);

  res.status(200).send(resData);
}

export default {
  profile,
  changeEmail,
  changePassword,
  changeProfile,
};
