import imagekit from "../configs/imagekit.js";
import fs from "fs";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";

// add post
export const addPost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { content, post_type } = req.body;
    const images = req.files;

    let image_urls = [];

    if (images.length) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          const response = await imagekit.files.upload({
            file: fs.createReadStream(image.path),
            fileName: image.originalname,
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

          return url;
        }),
      );
    }

    await Post.create({
        user: userId,
        content,
        image_urls,
        post_type
    })

    return res.json({
        success: true,
        message:"Post created successfully"
    })

  } catch (error) {
    return res.json({
        success: false,
        message: error.message
    })
  }
};

// get post
export const getFeedPost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);

    //user connections and following

    const userIds = [userId , ...user.connections, ...user.following];

    const posts = await Post.find({user:{$in: userIds}}).populate('user').sort({createdAt:-1});

    res.json({
        success: true,
        posts
    })

  } catch (error) {
    return res.json({
        success: false,
        message: error.message
    })
  }
};

//like post and unlike post
export const likePost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const {postId} = req.body;

    const post= await Post.findById(postId);

    if(post.likes_count.includes(userId)){
        post.likes_count = post.likes_count.filter(user => user !== userId)
        await post.save();
        res.json({
            success:true,
            message: "Post unliked"
        })
    }else{
        post.likes_count.push(userId);
        await post.save;
        res.json({
            success:true,
            message: "Post liked"
        })
    }

  } catch (error) {
    return res.json({
        success: false,
        message: error.message
    })
  }
};
