import express from "express";
import userController from "../controllers/user.controller";
import { validateAccessToken } from "../middlewares/validateAccessToken";

const router = express.Router();

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

export default router;
