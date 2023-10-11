import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { CreateArticleSchema } from "../models/article.model";

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
  await prisma.article.create({
    data: {
      ...article.data,
      author: {
        connect: {
          id: id,
        },
      },
    },
  });
  res.sendStatus(200);
}

export default {
  createArticle,
};
