import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import rawUsers from "./users.json";
import rawArticles from "./articles.json";
import { generateSlug } from "../../src/helpers/generateSlug";

interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  name: string;
  bio: string;
  image: string;
  refreshToken: string[];
  followerCount: number;
  followingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  favouriteCount: number;
  createdAt: Date;
  updatedAt: Date;
  author_id: string;
}

const prisma = new PrismaClient();

async function seed() {
  const users: User[] = [];
  const articles: Article[] = [];

  const userCount = await prisma.user.count();

  if (userCount) {
    throw "Database already has the data";
  }

  console.log(
    "---------------------------- Start seeding database ---------------------------- "
  );

  for (const u of rawUsers) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(u.password, salt);
    const newUser = await prisma.user.create({
      data: { ...u, password: hashedPassword },
    });
    users.push(newUser);
  }

  const tagsList = [
    ["Lorem", "ipsum", "dolor"],
    ["consectetur", "adipiscing"],
    ["Mauris", "rutrum", "ligula", "et"],
    ["Vivamus"],
    ["Nulla", "porttitor"],
    ["Etiam", "pretium"],
    ["molestie"],
    ["Suspendisse", "eugiat ornare", "cursus"],
  ];

  for (const a of rawArticles) {
    const slug = generateSlug(a.title);
    const author = users[Math.floor(Math.random() * 10)];
    const tags = tagsList[Math.floor(Math.random() * 8)];
    const newArticle = await prisma.article.create({
      data: {
        ...a,
        slug: slug,
        author_id: author.id,
        tags: tags,
      },
    });
    articles.push(newArticle);
  }

  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if (i == j) continue;
      const follow = Math.random() < 0.5;
      if (!follow) continue;

      await prisma.$transaction(async (tx) => {
        await tx.follow.create({
          data: {
            following_id: users[i].id,
            follower_id: users[j].id,
          },
        });

        await tx.user.update({
          where: {
            id: users[i].id,
          },
          data: {
            followerCount: {
              increment: 1,
            },
          },
        });

        await tx.user.update({
          where: {
            id: users[j].id,
          },
          data: {
            followingCount: {
              increment: 1,
            },
          },
        });
      });
    }
  }

  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < articles.length; j++) {
      const follow = Math.random() < 0.5;
      if (!follow) continue;
      await prisma.$transaction(async (tx) => {
        await tx.favourite.create({
          data: {
            user_id: users[i].id,
            article_id: articles[j].id,
          },
        });

        await tx.article.update({
          where: {
            id: articles[j].id,
          },
          data: {
            favouriteCount: {
              increment: 1,
            },
          },
        });
      });
    }
  }

  console.log(
    "---------------------------- Done seeding database ---------------------------- "
  );
}

seed()
  .catch((e) => console.log(e))
  .finally(() => prisma.$disconnect());
