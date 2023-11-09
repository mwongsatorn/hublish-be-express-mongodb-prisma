import express from "express";
import userController from "../controllers/user.controller";
import { requireLogin } from "../middlewares/requireLogin";
import { isLoggedIn } from "../middlewares/isLoggedIn";

const router = express.Router();

router.get("/current", requireLogin, userController.getCurrentUser);

router.put("/settings/email", requireLogin, userController.changeEmail);

router.put("/settings/password", requireLogin, userController.changePassword);

router.put("/settings/profile", requireLogin, userController.changeProfile);

router.get("/:username/profile", isLoggedIn, userController.getUserProfile);

router.post("/:username/follow", requireLogin, userController.followUser);

router.delete("/:username/follow", requireLogin, userController.unfollowUser);

router.get("/:username/followers", isLoggedIn, userController.getUserFollowers);

router.get(
  "/:username/followings",
  isLoggedIn,
  userController.getUserFollowings
);
export default router;
