import express from "express";
import userController from "../controllers/user.controller";
import { requireLogin } from "../middlewares/requireLogin";
import { isLoggedIn } from "../middlewares/isLoggedIn";

const router = express.Router();

router.get("/current", requireLogin, userController.getCurrentUser);

router.get("/:username/profile", isLoggedIn, userController.getUserProfile);

router.put("/settings/email", requireLogin, userController.changeEmail);
router.put("/settings/password", requireLogin, userController.changePassword);

router.put("/settings/profile", requireLogin, userController.changeProfile);

router.post("/:user_id/follow", requireLogin, userController.followUser);

router.delete("/:user_id/follow", requireLogin, userController.unfollowUser);

router.get("/:user_id/followers", isLoggedIn, userController.getUserFollowers);

router.get("/:user_id/followings", isLoggedIn, userController.getUserFollowings);

export default router;
