import express from "express";
import articleContoller from "../controllers/article.controller";
import { requireLogin } from "../middlewares/requireLogin";
import { isLoggedIn } from "../middlewares/isLoggedIn";

const router = express.Router();

router.post("/", requireLogin, articleContoller.createArticle);

router.get("/feed", requireLogin, articleContoller.getFeedArticles);

router.get(
  "/:username/favourite",
  isLoggedIn,
  articleContoller.getFavouriteArticles
);

router.get(
  "/:username/created",
  isLoggedIn,
  articleContoller.getUserCreatedArticles
);

router.get("/:slug", isLoggedIn, articleContoller.getArticle);
router.put("/:slug", requireLogin, articleContoller.editArticle);
router.delete("/:slug", requireLogin, articleContoller.deleteArticle);

router.get("/:slug/comments", isLoggedIn, articleContoller.getComments);

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
