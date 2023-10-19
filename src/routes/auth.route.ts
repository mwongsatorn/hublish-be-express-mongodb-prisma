import express from "express";
import authController from "../controllers/auth.controller";

const router = express.Router();

router.post("/signup", authController.signUp);

router.post("/login", authController.logIn);

router.get("/refresh", authController.refreshAccessToken);

router.delete("/logout", authController.logOut);

export default router;
