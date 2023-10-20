import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  AddCommentSchema,
  CreateArticleSchema,
  EditArticleSchema,
} from "../models/article.model";
import { generateSlug } from "../helpers/generateSlug";
import { z } from "zod";

const prisma = new PrismaClient();

interface ArticleRequest extends Request {
  id: string;
}

async function createArticle(req: Request, res: Response) {
  const article = CreateArticleSchema.safeParse(req.body);
  if (!article.success) {
    return res.sendStatus(400);
  }
  const { id } = req as ArticleRequest;
  const slug = generateSlug(article.data.title);
  const createdArticle = await prisma.article.create({
    data: {
      ...article.data,
      slug: slug,
      author: {
        connect: {
          id: id,
        },
      },
    },
  });
  res.status(200).send(createdArticle);
}

async function getArticle(req: Request, res: Response) {
  const validateParams = z.object({ slug: z.string() }).safeParse(req.params);
  if (!validateParams.success) return res.sendStatus(400);

  const foundArticle = await prisma.article.findFirst({
    where: {
      slug: validateParams.data.slug,
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

  const favourite = await prisma.favourite.create({
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

  const article = await prisma.article.update({
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

  const unfavourite = await prisma.favourite.delete({
    where: {
      user_id: id,
      article: {
        slug: req.params.slug,
      },
    },
  });

  const article = await prisma.article.update({
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
};
