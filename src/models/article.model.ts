import { z } from "zod";

export type CreateArticle = z.infer<typeof CreateArticleSchema>;
export const CreateArticleSchema = z
  .object({
    title: z.string().max(70, {
      message: "Your title can not be more than 70 characters",
    }),
    slug: z.string(),
    content: z.string().max(1500, {
      message: "Your content can not be more than 1,500 characters",
    }),
    tags: z
      .string()
      .array()
      .optional()
      .refine(
        (array) => {
          if (Array.isArray(array)) {
            return array.every((element) => element.length < 20);
          } else return true;
        },
        {
          message: "Each tag can not be more than 20 characters",
        }
      ),
  })
  .refine(
    (schema) => {
      const hyphenatedString = schema.title
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

      return schema.slug === hyphenatedString;
    },
    { message: "Your slug doesn't match the title", path: ["slug"] }
  );
