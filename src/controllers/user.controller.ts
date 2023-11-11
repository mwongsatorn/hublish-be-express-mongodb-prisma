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

async function getCurrentUser(req: Request, res: Response) {
  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      id: id,
    },
  });
  if (!foundUser) return res.sendStatus(404);

  const resData = excludeFields(foundUser, ["refreshToken", "password"]);

  res.status(200).send(resData);
}

async function getUserProfile(req: Request, res: Response) {
  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      username: req.params.username,
    },
  });
  if (!foundUser) return res.sendStatus(404);

  const followRelation = await prisma.follow.findFirst({
    where: {
      follower_id: id,
      following_id: foundUser.id,
    },
  });

  const resData = excludeFields(foundUser, ["refreshToken", "password"]);

  const followed = !id ? false : followRelation ? true : false;

  res.status(200).send({ ...resData, followed: followed });
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

async function followUser(req: Request, res: Response) {
  const { id: loggedInUserId } = req as UserRequest;
  const userToFollow = await prisma.user.findUnique({
    where: {
      username: req.params.username,
    },
  });

  if (!userToFollow) return res.status(404).send({ error: "User not found." });

  if (loggedInUserId === userToFollow.id)
    return res.status(400).send({ error: "You cannot follow yourself." });

  const isFollowing = await prisma.follow.findFirst({
    where: {
      following_id: userToFollow.id,
      follower_id: loggedInUserId,
    },
  });

  if (isFollowing)
    return res
      .sendStatus(409)
      .send({ error: "You have already followed this user." });

  await prisma.$transaction(async (tx) => {
    await tx.follow.create({
      data: {
        following_id: userToFollow.id,
        follower_id: loggedInUserId,
      },
    });

    const followingUser = await tx.user.update({
      where: {
        id: userToFollow.id,
      },
      data: {
        followerCount: {
          increment: 1,
        },
      },
    });

    await tx.user.update({
      where: {
        id: loggedInUserId,
      },
      data: {
        followingCount: {
          increment: 1,
        },
      },
    });

    const resData = excludeFields(followingUser, ["password", "refreshToken"]);
    return res.status(201).send(resData);
  });
}

async function unfollowUser(req: Request, res: Response) {
  const { id: loggedInUserId } = req as UserRequest;

  const userToUnfollow = await prisma.user.findUnique({
    where: {
      username: req.params.username,
    },
  });

  if (!userToUnfollow)
    return res.status(404).send({ error: "User not found." });

  if (loggedInUserId === userToUnfollow.id)
    return res.status(409).send({ error: "You cannot unfollow yourself." });

  const isFollowing = await prisma.follow.findFirst({
    where: {
      following_id: userToUnfollow.id,
      follower_id: loggedInUserId,
    },
  });

  if (!isFollowing)
    return res
      .sendStatus(404)
      .send({ error: "You have not followed this user yet." });

  await prisma.$transaction(async (tx) => {
    await tx.follow.delete({
      where: {
        id: isFollowing.id,
      },
    });

    const followingUser = await tx.user.update({
      where: {
        id: userToUnfollow.id,
      },
      data: {
        followerCount: {
          decrement: 1,
        },
      },
    });

    await tx.user.update({
      where: {
        id: loggedInUserId,
      },
      data: {
        followingCount: {
          decrement: 1,
        },
      },
    });

    const resData = excludeFields(followingUser, ["password", "refreshToken"]);
    return res.status(200).send(resData);
  });
}

async function getUserFollowers(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: {
      username: req.params.username,
    },
  });

  if (!user) return res.status(404).send({ error: "User not found." });

  const followerUsers = await prisma.user.aggregateRaw({
    pipeline: [
      {
        $lookup: {
          from: "Follow",
          pipeline: [
            {
              $match: {
                following_id: {
                  $oid: user.id,
                },
              },
            },
          ],
          as: "userFollowRelations",
        },
      },
      {
        $match: {
          $expr: {
            $in: ["$_id", "$userFollowRelations.follower_id"],
          },
        },
      },
      {
        $lookup: {
          from: "Follow",
          let: {
            user_id: "$_id",
          },
          pipeline: [
            {
              $match: {
                follower_id: {
                  $oid: (req as UserRequest).id,
                },
                $expr: {
                  $eq: ["$following_id", "$$user_id"],
                },
              },
            },
          ],
          as: "loggedInUserFollowRelations",
        },
      },
      {
        $project: {
          _id: 0,
          id: {
            $toString: "$_id",
          },
          username: 1,
          name: 1,
          bio: 1,
          image: 1,
          followed: {
            $cond: {
              if: {
                $in: ["$_id", "$loggedInUserFollowRelations.following_id"],
              },
              then: true,
              else: false,
            },
          },
        },
      },
    ],
  });

  res.status(200).send(followerUsers);
}

async function getUserFollowings(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: {
      username: req.params.username,
    },
  });

  if (!user) return res.status(404).send({ error: "User not found." });

  const followingUsers = await prisma.user.aggregateRaw({
    pipeline: [
      {
        $lookup: {
          from: "Follow",
          pipeline: [
            {
              $match: {
                follower_id: {
                  $oid: user.id,
                },
              },
            },
          ],
          as: "userFollowRelations",
        },
      },
      {
        $match: {
          $expr: {
            $in: ["$_id", "$userFollowRelations.following_id"],
          },
        },
      },
      {
        $lookup: {
          from: "Follow",
          let: {
            user_id: "$_id",
          },
          pipeline: [
            {
              $match: {
                follower_id: {
                  $oid: (req as UserRequest).id,
                },
                $expr: {
                  $eq: ["$following_id", "$$user_id"],
                },
              },
            },
          ],
          as: "loggedInUserFollowRelations",
        },
      },
      {
        $project: {
          _id: 0,
          id: {
            $toString: "$_id",
          },
          username: 1,
          name: 1,
          bio: 1,
          image: 1,
          followed: {
            $cond: {
              if: {
                $in: ["$_id", "$loggedInUserFollowRelations.following_id"],
              },
              then: true,
              else: false,
            },
          },
        },
      },
    ],
  });

  res.status(200).send(followingUsers);
}

export default {
  getCurrentUser,
  getUserProfile,
  changeEmail,
  changePassword,
  changeProfile,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowings,
};
