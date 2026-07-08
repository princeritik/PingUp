import express from "express";
import { discoverUsers, followUser, getUserData, unFollowUser, updateUserData, sentConnectionRequest, acceptConnectionRequest, getUserConnection } from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.js";
import { upload } from "../configs/multer.js";

const userRouter = express.Router();

userRouter.get("/data", protect, getUserData);
userRouter.post(
  "/update",
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  protect,
  updateUserData,
);
userRouter.post('/discover', protect, discoverUsers)
userRouter.post('/follow',protect, followUser)
userRouter.post('/unfollow',protect, unFollowUser)
userRouter.post('/connect', protect, sentConnectionRequest)
userRouter.post('/accept', protect, acceptConnectionRequest)
userRouter.get('/connections', protect, getUserConnection)



export default userRouter;