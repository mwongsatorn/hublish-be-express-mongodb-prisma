import express from "express";
import userController from "../controllers/user.controller";
import { validateAccessToken } from "../middlewares/validateAccessToken";

const router = express.Router();

router.post("/signup", userController.signUp);
router.post("/login", userController.logIn);

router.get("/profile", validateAccessToken, userController.profile);

router.put("/settings/email", validateAccessToken, userController.changeEmail);
router.put(
  "/settings/password",
  validateAccessToken,
  userController.changePassword
);

router.put(
  "/settings/profile",
  validateAccessToken,
  userController.changeProfile
);

router.get("/refresh", userController.refreshAccessToken);

router.delete("/logout", userController.logOut);

export default router;
