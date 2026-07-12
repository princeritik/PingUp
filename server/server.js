import express from "express"
import cors from "cors"
import 'dotenv/config'
import connectDB from "./configs/db.js";

import {inngest,functions} from "./inngest/index.js"
import {serve} from "inngest/express"
import { clerkMiddleware } from '@clerk/express'
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import storyRouter from "./routes/story.route.js";
import messageRouter from "./routes/message.route.js";

const app = express();

await connectDB();

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(clerkMiddleware())

app.get('/', (req,res)=> {
    res.send("server is running")
})

app.use('/api/inngest', serve({client: inngest, functions}))
app.use('/api/user', userRouter);
app.use('/api/post', postRouter);
app.use('/api/story', storyRouter);
app.use('/api/message', messageRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, ()=> {
    console.log(`server is running  on port ${PORT} `)
})