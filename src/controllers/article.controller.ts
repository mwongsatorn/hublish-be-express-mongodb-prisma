import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  AddCommentSchema,
  CreateArticleSchema,
  EditArticleSchema,
} from "../models/article.model";
import { generateSlug } from "../helpers/generateSlug";

const prisma = new PrismaClient();

interface ArticleRequest extends Request {
  id: string;
}

async function createArticle(req: Request, res: Response) {
  const validateBody = CreateArticleSchema.safeParse(req.body);
  if (!validateBody.success) {
    return res.sendStatus(400);
  }
  const { id } = req as ArticleRequest;
  const slug = generateSlug(validateBody.data.title);
  console.log(validateBody.data, slug);
  const createdArticle = await prisma.article.create({
    data: {
      ...validateBody.data,
      slug: slug,
      author_id: id,
    },
  });
  res.status(201).send(createdArticle);
}

async function getArticle(req: Request, res: Response) {
  const foundArticle = await prisma.article.findFirst({
    where: {
      slug: req.params.slug,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          image: true,
          bio: true,
          name: true,
        },
      },
    },
  });

  if (!foundArticle) return res.sendStatus(404);

  res.status(200).send(foundArticle);
}

async function editArticle(req: Request, res: Response) {
  const validateBody = EditArticleSchema.safeParse(req.body);
  if (!validateBody.success) return res.sendStatus(400);

  const { id } = req as ArticleRequest;

  const slug = validateBody.data.title
    ? generateSlug(validateBody.data.title)
    : null;

  const editedArticle = await prisma.article.update({
    where: {
      slug: req.params.slug,
      author_id: id,
    },
    data: {
      ...validateBody.data,
      ...(slug && { slug }),
    },
  });

  if (!editedArticle) return res.sendStatus(404);

  res.status(200).send(editedArticle);
}

async function deleteArticle(req: Request, res: Response) {
  const { id } = req as ArticleRequest;
  await prisma.article.delete({
    where: {
      slug: req.params.slug,
      author_id: id,
    },
  });
  res.sendStatus(204);
}

async function addComment(req: Request, res: Response) {
  const validateBody = AddCommentSchema.safeParse(req.body);
  if (!validateBody.success) return res.sendStatus(400);

  const { id } = req as ArticleRequest;

  const addedComment = await prisma.comment.create({
    data: {
      body: validateBody.data.body,
      commentAuthor: {
        connect: {
          id: id,
        },
      },
      aritcleDetails: {
        connect: {
          slug: req.params.slug,
        },
      },
    },
    include: {
      commentAuthor: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
        },
      },
    },
  });
  res.status(201).send(addedComment);
}

async function deleteComment(req: Request, res: Response) {
  const { id } = req as ArticleRequest;
  await prisma.comment.delete({
    where: {
      id: req.params.comment_id,
      commentAuthor_id: id,
    },
  });
  res.sendStatus(204);
}

async function getComments(req: Request, res: Response) {
  const comments = await prisma.comment.findMany({
    where: {
      aritcleDetails: {
        slug: req.params.slug,
      },
    },
    include: {
      commentAuthor: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
        },
      },
    },
  });
  res.status(200).send(comments);
}

async function favouriteArticle(req: Request, res: Response) {
  const { id } = req as ArticleRequest;
  const isFavourited = await prisma.favourite.findFirst({
    where: {
      user: {
        id: id,
      },
      article: {
        slug: req.params.slug,
      },
    },
  });

  if (isFavourited) return res.sendStatus(409);

  await prisma.$transaction(async (tx) => {
    const favourite = await tx.favourite.create({
      data: {
        user: {
          connect: {
            id: id,
          },
        },
        article: {
          connect: {
            slug: req.params.slug,
          },
        },
      },
    });

    const article = await tx.article.update({
      where: {
        slug: req.params.slug,
      },
      data: {
        favouriteCount: {
          increment: 1,
        },
      },
    });

    res.status(200).send(article);
  });
}

async function unfavouriteArticle(req: Request, res: Response) {
  const { id } = req as ArticleRequest;
  const isFavourited = await prisma.favourite.findFirst({
    where: {
      user_id: id,
      article: {
        slug: req.params.slug,
      },
    },
  });

  if (!isFavourited) return res.sendStatus(404);

  await prisma.$transaction(async (tx) => {
    const unfavourite = await tx.favourite.delete({
      where: {
        id: isFavourited.id,
      },
    });

    const article = await tx.article.update({
      where: {
        slug: req.params.slug,
      },
      data: {
        favouriteCount: {
          decrement: 1,
        },
      },
    });

    res.status(200).send(article);
  });
}

async function getFavouriteArticles(req: Request, res: Response) {
  const { user_id } = req.params;
  const { id } = req as ArticleRequest;
  const userFavouriteRelations = {
    $lookup: {
      from: "Favourite",
      pipeline: [
        {
          $match: {
            user_id: {
              $oid: user_id,
            },
          },
        },
      ],
      as: "userFavouriteRelations",
    },
  };
  const userFavouriteArticles = [
    {
      $match: {
        $expr: {
          $in: ["$_id", "$userFavouriteRelations.article_id"],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ];

  const loggedInUserFavouriteRelations = {
    $lookup: {
      from: "Favourite",
      let: {
        article_id: "$userFavouriteRelations.article_id",
      },
      pipeline: [
        {
          $match: {
            user_id: {
              $oid: id,
            },
            $expr: {
              $in: ["$article_id", "$$article_id"],
            },
          },
        },
        { $unset: ["_id", "user_id"] },
      ],
      as: "loggedInUserFavouriteRelations",
    },
  };
  const author = {
    $lookup: {
      from: "User",
      let: { author_id: "$author_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$_id", "$$author_id"],
            },
          },
        },
        {
          $project: {
            _id: 0,
            username: 1,
            name: 1,
            bio: 1,
            image: 1,
          },
        },
      ],
      as: "author",
    },
  };
  const specifyFields = [
    {
      $addFields: {
        id: {
          $toString: "$_id",
        },
        author_id: {
          $toString: "$author_id",
        },
        createdAt: {
          $toString: "$createdAt",
        },
        updatedAt: {
          $toString: "$updatedAt",
        },
        favourited: {
          $cond: {
            if: {
              $in: ["$_id", "$loggedInUserFavouriteRelations.article_id"],
            },
            then: true,
            else: false,
          },
        },
        author: {
          $arrayElemAt: ["$author", 0],
        },
      },
    },
    {
      $unset: [
        "_id",
        "userFavouriteRelations",
        "loggedInUserFavouriteRelations",
      ],
    },
  ];
  const favouriteArticles = await prisma.article.aggregateRaw({
    pipeline: [
      userFavouriteRelations,
      ...userFavouriteArticles,
      author,
      loggedInUserFavouriteRelations,
      ...specifyFields,
    ],
  });

  res.status(200).send(favouriteArticles);
}

async function getFeedArticles(req: Request, res: Response) {
  const { id } = req as ArticleRequest;

  const followingRelations = {
    $lookup: {
      from: "Follow",
      pipeline: [
        {
          $match: {
            follower_id: {
              $oid: id,
            },
          },
        },
      ],
      as: "followingRelations",
    },
  };

  const articlesList = [
    {
      $match: {
        $expr: {
          $in: ["$author_id", "$followingRelations.following_id"],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ];

  const loggedInUserFavouriteRelations = {
    $lookup: {
      from: "Favourite",
      let: {
        article_id: "$article_id",
      },
      pipeline: [
        {
          $match: {
            user_id: {
              $oid: id,
            },
            $expr: {
              $eq: ["$article_id", "$$article_id"],
            },
          },
        },
        { $unset: ["_id", "user_id"] },
      ],
      as: "loggedInUserFavouriteRelations",
    },
  };

  const author = {
    $lookup: {
      from: "User",
      let: { author_id: "$author_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$_id", "$$author_id"],
            },
          },
        },
        {
          $project: {
            _id: 0,
            username: 1,
            name: 1,
            bio: 1,
            image: 1,
          },
        },
      ],
      as: "author",
    },
  };

  const specifyFields = [
    {
      $addFields: {
        id: {
          $toString: "$_id",
        },
        author_id: {
          $toString: "$author_id",
        },
        createdAt: {
          $toString: "$createdAt",
        },
        updatedAt: {
          $toString: "$updatedAt",
        },
        favourited: {
          $cond: {
            if: {
              $in: ["$_id", "$loggedInUserFavouriteRelations.article_id"],
            },
            then: true,
            else: false,
          },
        },
        author: {
          $arrayElemAt: ["$author", 0],
        },
      },
    },
    {
      $unset: ["_id", "loggedInUserFavouriteRelations", "followingRelations"],
    },
  ];

  const feedArticles = await prisma.article.aggregateRaw({
    pipeline: [
      followingRelations,
      ...articlesList,
      loggedInUserFavouriteRelations,
      author,
      ...specifyFields,
    ],
  });

  res.status(200).send(feedArticles);
}

async function getUserCreatedArticles(req: Request, res: Response) {
  const { user_id } = req.params;
  const { id } = req as ArticleRequest;

  const articleList = [
    {
      $match: {
        author_id: {
          $oid: user_id,
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ];
  const author = {
    $lookup: {
      from: "User",
      let: { author_id: "$author_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$_id", "$$author_id"],
            },
          },
        },
        {
          $project: {
            _id: 0,
            username: 1,
            name: 1,
            bio: 1,
            image: 1,
          },
        },
      ],
      as: "author",
    },
  };

  const loggedInUserFavouriteRelations = {
    $lookup: {
      from: "Favourite",
      let: {
        article_id: "$article_id",
      },
      pipeline: [
        {
          $match: {
            user_id: {
              $oid: id,
            },
            $expr: {
              $eq: ["$article_id", "$$article_id"],
            },
          },
        },
        { $unset: ["_id", "user_id"] },
      ],
      as: "loggedInUserFavouriteRelations",
    },
  };

  const specifyFields = [
    {
      $addFields: {
        id: {
          $toString: "$_id",
        },
        author_id: {
          $toString: "$author_id",
        },
        createdAt: {
          $toString: "$createdAt",
        },
        updatedAt: {
          $toString: "$updatedAt",
        },
        favourited: {
          $cond: {
            if: {
              $in: ["$_id", "$loggedInUserFavouriteRelations.article_id"],
            },
            then: true,
            else: false,
          },
        },
        author: {
          $arrayElemAt: ["$author", 0],
        },
      },
    },
    {
      $unset: ["_id", "loggedInUserFavouriteRelations", "followingRelations"],
    },
  ];

  const createdArticles = await prisma.article.aggregateRaw({
    pipeline: [
      ...articleList,
      author,
      loggedInUserFavouriteRelations,
      ...specifyFields,
    ],
  });

  res.status(200).send(createdArticles);
}

export default {
  createArticle,
  getArticle,
  editArticle,
  deleteArticle,
  addComment,
  deleteComment,
  getComments,
  favouriteArticle,
  unfavouriteArticle,
  getFavouriteArticles,
  getFeedArticles,
  getUserCreatedArticles,
};
