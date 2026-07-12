import fs from "fs";
import Message from "../models/message.model.js";
import imagekit from "../configs/imagekit.js";

// create an empty object to store server side event connections
const connections = {};

export const sseController = (req, res) => {
  const { userId } = req.params;

  //console.log("New client connected:", userId);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  connections[userId] = res;

  // send first test event
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  req.on("close", () => {
    delete connections[userId];
    //console.log("Client disconnected:", userId);
  });
};


// send message
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();

    const { to_user_id, text } = req.body;
    const image = req.file;

    if (!to_user_id) {
      return res.json({
        success: false,
        message: "Receiver user id is required",
      });
    }

    if (!text && !image) {
      return res.json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    let media_url = "";
    const message_type = image ? "image" : "text";

    if (message_type === "image") {
      const response = await imagekit.files.upload({
        file: fs.createReadStream(image.path),
        fileName: image.originalname,
      });

      media_url = imagekit.helper.buildSrc({
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
        src: response.filePath,
        transformation: [
          {
            width: 1280,
            format: "webp",
          },
        ],
      });
    }

    const message = await Message.create({
      from_user_id: userId,
      to_user_id,
      text,
      message_type,
      media_url,
    });

    const messageWithUserData = await Message.findById(message._id)
      .populate("from_user_id");

    // send message to receiver using SSE
    if (connections[to_user_id]) {
      connections[to_user_id].write(
        `data: ${JSON.stringify(messageWithUserData)}\n\n`
      );
    }

    return res.json({
      success: true,
      message,
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};


// get chat messages
export const getChatMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id } = req.body;

    if (!to_user_id) {
      return res.json({
        success: false,
        message: "Receiver user id is required",
      });
    }

    const messages = await Message.find({
      $or: [
        {
          from_user_id: userId,
          to_user_id,
        },
        {
          from_user_id: to_user_id,
          to_user_id: userId,
        },
      ],
    }).sort({
      createdAt: 1,
    });

    // mark messages as seen
    await Message.updateMany(
      {
        from_user_id: to_user_id,
        to_user_id: userId,
      },
      {
        $set: {
          seen: true,
        },
      }
    );

    return res.json({
      success: true,
      messages,
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};


// get user recent messages
export const getUserRecentMessages = async (req, res) => {
  try {
    const { userId } = req.auth();

    const messages = await Message.find({
      to_user_id: userId,
    })
      .populate("from_user_id to_user_id")
      .sort({
        createdAt: -1,
      });

    return res.json({
      success: true,
      messages,
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

//mark seen msg
export const markMessageAsSeen = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { from_user_id } = req.body;

    if (!from_user_id) {
      return res.json({
        success: false,
        message: "Sender user id is required",
      });
    }

    const result = await Message.updateMany(
      {
        from_user_id: from_user_id,
        to_user_id: userId,
        seen: false,
      },
      {
        $set: {
          seen: true,
        },
      }
    );

    return res.json({
      success: true,
      message: "Messages marked as seen",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};