import User from "../models/user.model.js";
import fs from "fs";
import imagekit from "../configs/imagekit.js";
import { format } from "path";
import Connection from "../models/connection.model.js";
import Post from "../models/post.model.js";
import { err } from "inngest/types";
import { inngest } from "../inngest/index.js";

//get userData using usedId
export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth();

    const user = await User.findById(userId);
    if (!user) {
      return res.json({
        success: false,
        message: "User is not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

//update user data
export const updateUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    let { username, bio, location, full_name } = req.body;

    const tempUser = await User.findById(userId);

    !username && (username = tempUser.username);

    if (username !== tempUser.username) {
      const user = await User.findOne({ username });
      if (user) {
        username = tempUser.username;
      }
    }

    const updatedData = {
      username,
      bio,
      location,
      full_name,
    };

    const profile = req.files?.profile?.[0];
    const cover = req.files?.cover?.[0];

    if (profile) {
      const response = await imagekit.files.upload({
        file: fs.createReadStream(profile.path),
        fileName: profile.originalname,
      });
      const url = imagekit.helper.buildSrc({
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
        src: response.filePath,
        transformation: [
          {
            width: 512,
            format: "webp",
          },
        ],
      });
      updatedData.profile_picture = url;
    }

    if (cover) {
      const response = await imagekit.files.upload({
        file: fs.createReadStream(cover.path),
        fileName: cover.originalname,
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
      updatedData.cover_photo = url;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updatedData },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.json({
      success: true,
      user,
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

//find user using username , email, location, name
export const discoverUsers = async (req, res) => {
  try {
    const { userId } = req.auth();

    const { input } = req.body;

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, 'i') },
        { email: new RegExp(input, 'i') },
        { full_name: new RegExp(input, 'i') },
        { location: new RegExp(input, 'i') },
      ],
    });

    const filteredUsers = allUsers.filter((user) => user._id !== userId);

    return res.json({
      success: true,
      users: filteredUsers,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

//follow user
export const followUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    if (user.following.includes(id)) {
      return res.json({
        success: false,
        message: "You are already following this user",
      });
    }

    const toUser = await User.findById(id);

    if (!toUser) {
      return res.json({
        success: false,
        message: "Target user not found",
      });
    }

    user.following.push(id);
    await user.save();

    toUser.followers.push(userId);
    await toUser.save();

    return res.json({
      success: true,
      message: "Now you are following this user",
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

//unflow user
export const unFollowUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);

    user.following = user.following.filter((user) => user != id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers = toUser.followers.filter((user) => user != userId);
    await toUser.save();

    return res.json({
      success: true,
      message: "You are no longer following this user",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

//send connection request
export const sentConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const connectionRequests = await Connection.find({
      from_user_id: userId,
      createdAt: { $gt: last24Hours },
    });

    if (connectionRequests.length >= 20) {
      return res.json({
        success: false,
        message:
          "You have sent more than 20 connection requests in last 24 hours ",
      });
    }

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });

    if (!connection) {
      const newConnection =  await Connection.create({
        from_user_id: userId,
        to_user_id: id,
      });

      await inngest.send({
        name: 'app/connection-request',
        data: {connectionId: newConnection._id}
      })

      return res.json({
        success: true,
        message: "Connection request sent successfully",
      });
    } else if (connection && connection.status === "accepted") {
      return res.json({
        success: false,
        message: "You are already connected with this user",
      });
    }

    return res.json({
      success: false,
      message: "Connection request pending",
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

//get user connection
export const getUserConnection = async (req, res) => {
  try {
    const { userId } = req.auth();

    const user = await User.findById(userId).populate(
      "connections followers following"
    );

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    const pendingConnections = (
      await Connection.find({
        to_user_id: userId,
        status: "pending",
      }).populate("from_user_id")
    ).map((connection) => connection.from_user_id);

    return res.json({
      success: true,
      connections: user.connections,
      followers: user.followers,
      following: user.following,
      pendingConnections,
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

//accept conncetion request
export const acceptConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const connection = await Connection.findOne({
      from_user_id: id,
      to_user_id: userId,
    });

    if (!connection) {
      return res.json({
        success: false,
        message: "Connection not found",
      });
    }

    if (connection.status === "accepted") {
      return res.json({
        success: false,
        message: "Connection already accepted",
      });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        connections: id,
      },
    });

    await User.findByIdAndUpdate(id, {
      $addToSet: {
        connections: userId,
      },
    });

    connection.status = "accepted";
    await connection.save();

    return res.json({
      success: true,
      message: "Connetion accepted  successfully",
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

//get user profiles 
export const getUserProfiles = async(req,res) => {
  try {
    const {profileId} = req.body;

    const profile = await User.findById(profileId);
    if(!profile){
      return res.json({
        success: false,
        message: "Profile not found"
      })
    }

    const posts = await Post.find({user: profileId}).populate('user')
    
    res.json({
      success: true,
      profile,
      posts,
    })

  } catch (error) {
    res.json({
      success: false,
      message: error.message
    })
  }
}
