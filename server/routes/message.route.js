import express from "express"
import { getChatMessage, sseController } from "../controllers/message.controller.js";
import { upload } from "../configs/multer.js";
import { protect } from "../middlewares/auth.js";

const messageRouter = express.Router();

messageRouter.get('/:userId', sseController)
messageRouter.post('/send',upload.single('image') ,protect ,sseController);
messageRouter.post('/get', protect, getChatMessage);

export default messageRouter;