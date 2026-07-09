import fs from "fs";
import imagekit from "../configs/imagekit.js";
import Story from "../models/story.model.js";
import User from "../models/user.model.js";
import { inngest } from "../inngest/index.js";


//add story
export const addUserStory = async(req, res) => {
    try {
        
        const {userId} = req.auth();

        const {content, media_type, background_color} = req.body;

        const media = req.file;

        let media_url = ''
        //upload media to imagekit
        if(media_type === 'image' || media_type === 'video'){
            const response = await imagekit.files.upload({
            file: fs.createReadStream(media.path),
            fileName: media.originalname,
          });
          const url = imagekit.helper.buildSrc({
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
            src: response.filePath,
            transformation: [
              {
                width: 1280,
                format: "webp",
              },
            ],
          });
          media_url = url
        }

        //create story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color
        })

        //schedule story deletion after 24 hour
        await inngest.send({
            name: 'app/story.delete',
            data: {storyId: story._id}
        })

        res.json({
            success: true,
        })

    } catch (error) {
        res.json({
            success: false,
            message: error.message,
        })
    }
}

//get story
export const getStory = async(req, res) => {
    try {
        
        const {userId} = req.auth();

        const user = await User.findById(userId);

        //user connections and following
        const userIds = [userId, ...user.following, ...user.connections]

        const stories = await Story.find({
            user: {$in: userIds}
        }).populate('user').sort({createdAt:-1})

        res.json({
            success: true,
            stories
        })

    } catch (error) {
        res.json({
            success: false,
            message: error.message,
        })
    }
}
