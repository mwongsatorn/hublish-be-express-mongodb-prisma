import express from "express";
import articleContoller from "../controllers/article.controller";
import { validateAccessToken } from "../middlewares/validateAccessToken";

const router = express.Router();

router.post("/", validateAccessToken, articleContoller.createArticle);

export default router;
