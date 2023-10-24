import express from "express";
import articleContoller from "../controllers/article.controller";
import { validateAccessToken } from "../middlewares/validateAccessToken";

const router = express.Router();

router.post("/", validateAccessToken, articleContoller.createArticle);

router.get(
  "/favourite",
  validateAccessToken,
  articleContoller.getFavouriteArticles
);

router.get("/feed", validateAccessToken, articleContoller.getFeedArticles);

router.get("/:user_id/created", articleContoller.getUserCreatedArticles);

router.get("/:slug", articleContoller.getArticle);
router.put("/:slug", validateAccessToken, articleContoller.editArticle);
router.delete("/:slug", validateAccessToken, articleContoller.deleteArticle);

router.get("/:slug/comments", articleContoller.getComments);

router.post(
  "/:slug/comments",
  validateAccessToken,
  articleContoller.addComment
);

router.delete(
  "/:slug/comments/:comment_id",
  validateAccessToken,
  articleContoller.deleteComment
);

router.post(
  "/:slug/favourite",
  validateAccessToken,
  articleContoller.favouriteArticle
);

router.delete(
  "/:slug/favourite",
  validateAccessToken,
  articleContoller.unfavouriteArticle
);

export default router;
