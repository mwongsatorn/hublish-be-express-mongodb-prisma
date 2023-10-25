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
  const favouriteRelations = await prisma.favourite.findMany({
    where: {
      user_id: user_id,
    },
  });

  const articleIds = favouriteRelations.map((obj) => obj.article_id);
  const favouriteArticles = await prisma.article.findMany({
    where: {
      id: {
        in: articleIds,
      },
    },
    include: {
      author: {
        select: {
          username: true,
          bio: true,
          name: true,
          image: true,
        },
      },
    },
  });
  res.status(200).send(favouriteArticles);
}

async function getFeedArticles(req: Request, res: Response) {
  const { id } = req as ArticleRequest;
  const followRelations = await prisma.follow.findMany({
    where: {
      follower_id: id,
    },
  });
  const followingIds = followRelations.map((obj) => obj.following_id);
  const feedArticles = await prisma.article.findMany({
    where: {
      author_id: {
        in: followingIds,
      },
    },
    include: {
      author: {
        select: {
          username: true,
          bio: true,
          name: true,
          image: true,
        },
      },
    },
  });

  res.status(200).send(feedArticles);
}

async function getUserCreatedArticles(req: Request, res: Response) {
  const { user_id } = req.params;
  const createdArticles = await prisma.article.findMany({
    where: {
      author_id: user_id,
    },
    include: {
      author: {
        select: {
          username: true,
          bio: true,
          name: true,
          image: true,
        },
      },
    },
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
