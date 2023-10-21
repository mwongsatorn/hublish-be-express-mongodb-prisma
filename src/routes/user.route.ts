import express from "express";
import userController from "../controllers/user.controller";
import { validateAccessToken } from "../middlewares/validateAccessToken";

const router = express.Router();

router.get("/current", validateAccessToken, userController.getCurrentUser);

router.get("/:username/profile", userController.getUserProfile);

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

router.post("/:user_id/follow", validateAccessToken, userController.followUser);

export default router;
