import express from "express";
import articleContoller from "../controllers/article.controller";
import { requireLogin } from "../middlewares/requireLogin";

const router = express.Router();

router.post("/", requireLogin, articleContoller.createArticle);

router.get("/feed", requireLogin, articleContoller.getFeedArticles);

router.get("/:user_id/favourite", articleContoller.getFavouriteArticles);

router.get("/:user_id/created", articleContoller.getUserCreatedArticles);

router.get("/:slug", articleContoller.getArticle);
router.put("/:slug", requireLogin, articleContoller.editArticle);
router.delete("/:slug", requireLogin, articleContoller.deleteArticle);

router.get("/:slug/comments", articleContoller.getComments);

router.post("/:slug/comments", requireLogin, articleContoller.addComment);

router.delete(
  "/:slug/comments/:comment_id",
  requireLogin,
  articleContoller.deleteComment
);

router.post(
  "/:slug/favourite",
  requireLogin,
  articleContoller.favouriteArticle
);

router.delete(
  "/:slug/favourite",
  requireLogin,
  articleContoller.unfavouriteArticle
);

export default router;
