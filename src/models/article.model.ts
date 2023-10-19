import { z } from "zod";

export type CreateArticle = z.infer<typeof CreateArticleSchema>;
export const CreateArticleSchema = z.object({
  title: z.string().max(70, {
    message: "Your title can not be more than 70 characters",
  }),
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
});

export type EditArticle = z.infer<typeof EditArticleSchema>;
export const EditArticleSchema = CreateArticleSchema.partial();

export type AddComment = z.infer<typeof AddCommentSchema>;
export const AddCommentSchema = z.object({
  body: z.string().max(500, {
    message: "Your comment can not be more than 500 characters",
  }),
});
