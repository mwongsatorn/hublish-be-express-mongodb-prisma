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
  if (!foundUser) return res.status(404).json({ error: "No user found." });

  const resData = excludeFields(foundUser, ["refreshToken", "password"]);

  res.status(200).json(resData);
}

async function getUserProfile(req: Request, res: Response) {
  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      username: req.params.username,
    },
  });
  if (!foundUser) return res.status(404).json({ error: "No user found." });

  const followRelation = await prisma.follow.findFirst({
    where: {
      follower_id: id,
      following_id: foundUser.id,
    },
  });

  const resData = excludeFields(foundUser, ["refreshToken", "password"]);

  const followed = !id ? false : followRelation ? true : false;

  res.status(200).json({ ...resData, followed: followed });
}

async function changeEmail(req: Request, res: Response) {
  const validateBody = ChangeEmailSchema.safeParse(req.body);
  if (!validateBody.success)
    return res.status(400).json({ error: "Request body is invalid" });
  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      id: id,
    },
  });

  if (!foundUser) return res.status(404).json({ error: "No user found." });

  const isSamePassword = await bcrypt.compare(
    validateBody.data.password,
    foundUser.password
  );

  if (!isSamePassword)
    return res.status(401).json({ error: "Your password is incorrect." });

  const isUsedEmail = await prisma.user.findFirst({
    where: {
      email: validateBody.data.newEmail,
    },
  });

  if (isUsedEmail)
    return res.status(409).json({ error: "This email is already used." });

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      email: validateBody.data.newEmail,
    },
  });

  const resData = excludeFields(updatedUser, ["refreshToken", "password"]);

  res.status(200).json(resData);
}

async function changePassword(req: Request, res: Response) {
  const validateBody = ChangePasswordSchema.safeParse(req.body);
  if (!validateBody.success)
    return res.status(400).json({ error: "Request body is invalid" });
  const { id } = req as UserRequest;
  const foundUser = await prisma.user.findFirst({
    where: {
      id: id,
    },
  });

  if (!foundUser) return res.status(404).json({ error: "No user found." });

  const isSamePassword = await bcrypt.compare(
    validateBody.data.currentPassword,
    foundUser.password
  );
  if (!isSamePassword)
    return res.status(401).json({ error: "Your password is incorrect." });

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
  res.status(200).json(resData);
}

async function changeProfile(req: Request, res: Response) {
  const validateBody = ChangeProfileSchema.safeParse(req.body);
  if (!validateBody.success)
    return res.status(400).json({ error: "Request body is invalid" });

  const { id } = req as UserRequest;

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      ...validateBody.data,
    },
  });

  if (!updatedUser) return res.status(404).json({ error: "No user found." });

  const resData = excludeFields(updatedUser, ["refreshToken", "password"]);

  res.status(200).json(resData);
}

async function followUser(req: Request, res: Response) {
  const { id: loggedInUserId } = req as UserRequest;
  const userToFollow = await prisma.user.findUnique({
    where: {
      username: req.params.username,
    },
  });

  if (!userToFollow) return res.status(404).json({ error: "No user found." });

  if (loggedInUserId === userToFollow.id)
    return res.status(409).json({ error: "You cannot follow yourself." });

  const isFollowing = await prisma.follow.findFirst({
    where: {
      following_id: userToFollow.id,
      follower_id: loggedInUserId,
    },
  });

  if (isFollowing)
    return res
      .status(409)
      .json({ error: "You have already followed this user." });

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
    return res.status(201).json(resData);
  });
}

async function unfollowUser(req: Request, res: Response) {
  const { id: loggedInUserId } = req as UserRequest;

  const userToUnfollow = await prisma.user.findUnique({
    where: {
      username: req.params.username,
    },
  });

  if (!userToUnfollow) return res.status(404).json({ error: "No user found." });

  if (loggedInUserId === userToUnfollow.id)
    return res.status(409).json({ error: "You cannot unfollow yourself." });

  const isFollowing = await prisma.follow.findFirst({
    where: {
      following_id: userToUnfollow.id,
      follower_id: loggedInUserId,
    },
  });

  if (!isFollowing)
    return res
      .status(404)
      .json({ error: "You have not followed this user yet." });

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
    return res.status(200).json(resData);
  });
}

async function getUserFollowers(req: Request, res: Response) {
  const targetUser = await prisma.user.findUnique({
    where: {
      username: req.params.username,
    },
  });

  if (!targetUser) return res.status(404).json({ error: "No user found." });

  const followerUsers = await prisma.follow.aggregateRaw({
    pipeline: [
      {
        $match: {
          following_id: {
            $oid: targetUser.id,
          },
        },
      },
      {
        $lookup: {
          from: "User",
          localField: "follower_id",
          foreignField: "_id",
          as: "targetFollower",
        },
      },
      {
        $unwind: "$targetFollower",
      },
      {
        $lookup: {
          from: "Follow",
          let: {
            targetFollower_id: "$targetFollower._id",
          },
          pipeline: [
            {
              $match: {
                follower_id: {
                  $oid: (req as UserRequest).id,
                },
                $expr: {
                  $eq: ["$following_id", "$$targetFollower_id"],
                },
              },
            },
          ],
          as: "loggedInUserFollowRelations",
        },
      },
      {
        $project: {
          _id: {
            $toString: "$targetFollower._id",
          },
          username: "$targetFollower.username",
          name: "$targetFollower.name",
          bio: "$targetFollower.bio",
          image: "$targetFollower.image",
          followed: {
            $cond: {
              if: { $gt: [{ $size: "$loggedInUserFollowRelations" }, 0] },
              then: true,
              else: false,
            },
          },
        },
      },
    ],
  });

  res.status(200).json(followerUsers);
}

async function getUserFollowings(req: Request, res: Response) {
  const targetUser = await prisma.user.findUnique({
    where: {
      username: req.params.username,
    },
  });

  if (!targetUser) return res.status(404).json({ error: "No user found." });

  const followingUsers = await prisma.follow.aggregateRaw({
    pipeline: [
      {
        $match: {
          follower_id: {
            $oid: targetUser.id,
          },
        },
      },
      {
        $lookup: {
          from: "User",
          localField: "following_id",
          foreignField: "_id",
          as: "targetFollowing",
        },
      },
      {
        $unwind: "$targetFollowing",
      },
      {
        $lookup: {
          from: "Follow",
          let: {
            targetFollowing_id: "$targetFollowing._id",
          },
          pipeline: [
            {
              $match: {
                follower_id: {
                  $oid: (req as UserRequest).id,
                },
                $expr: {
                  $eq: ["$following_id", "$$targetFollowing_id"],
                },
              },
            },
          ],
          as: "loggedInUserFollowRelations",
        },
      },
      {
        $project: {
          _id: {
            $toString: "$targetFollowing._id",
          },
          username: "$targetFollowing.username",
          name: "$targetFollowing.name",
          bio: "$targetFollowing.bio",
          image: "$targetFollowing.image",
          followed: {
            $cond: {
              if: { $gt: [{ $size: "$loggedInUserFollowRelations" }, 0] },
              then: true,
              else: false,
            },
          },
        },
      },
    ],
  });

  res.status(200).json(followingUsers);
}

async function searchUsers(req: Request, res: Response) {
  const { query = "", limit = 10, page = 1 } = req.query;
  const { id: loggedInUserId } = req as UserRequest;
  const foundUsers = await prisma.user.aggregateRaw({
    pipeline: [
      {
        $facet: {
          total_results: [
            {
              $match: {
                $or: [
                  {
                    username: {
                      $regex: query,
                      $options: "i",
                    },
                  },
                  {
                    name: {
                      $regex: query,
                      $options: "i",
                    },
                  },
                ],
              },
            },
            {
              $count: "count",
            },
          ],
          results: [
            {
              $match: {
                $or: [
                  {
                    username: {
                      $regex: query,
                      $options: "i",
                    },
                  },
                  {
                    name: {
                      $regex: query,
                      $options: "i",
                    },
                  },
                ],
              },
            },
            {
              $skip: parseInt(limit as string) * (parseInt(page as string) - 1),
            },
            {
              $limit: parseInt(limit as string),
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
                        $oid: loggedInUserId,
                      },
                      $expr: {
                        $eq: ["$following_id", "$$user_id"],
                      },
                    },
                  },
                ],
                as: "loggedInUserFollowing",
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
                  $gt: [{ $size: "$loggedInUserFollowing" }, 0],
                },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          total_results: {
            $cond: {
              if: {
                $ne: [{ $size: "$total_results" }, 0],
              },
              then: {
                $arrayElemAt: ["$total_results.count", 0],
              },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          total_results: 1,
          total_pages: {
            $ceil: {
              $divide: ["$total_results", parseInt(limit as string)],
            },
          },
          page: {
            $literal: parseInt(page as string),
          },
          results: 1,
        },
      },
    ],
  });
  res.status(200).json(foundUsers[0]);
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
  searchUsers,
};
