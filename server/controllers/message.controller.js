import Message from "../models/message.model.js";

//create an empty object  to store server side event connections
const connections = {};

//controller function for server side endpoint
export const sseController = (req, res) => {
  const { userId } = req.params;
  console.log("New  client connected: ", userId);

  //set sse header
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connecton", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  //add the client's response object to connections objects
  connections[userId] = res;

  //send intital event to client
  res.write("log: Connected to SSE  stream\n\n ");

  //handle client disconnection
  req.on("close", () => {
    //remove the client's response object from the connection array
    delete connections[userId];
    console.log("Client disconnected");
  });
};

//send message
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id, text } = req.body;
    const image = req.file;

    let media_url = "";
    let message_type = image ? "image" : "text";

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
        media_url
    })

    //send message to to_user_id using sse
    const messageWithUserData = await Message.findById(message._id).populate('from_user_id')
    if(connections[to_user_id]){
        connections[to_user_id].write(`data:${JSON.stringify(messageWithUserData)}\n\n `)
    }

    res.json({
        success: true,
        message
    })

  } catch (error) {
    res.json({
        success: false,
        message: error.message,
    })
  }
};

//get chat message
export const getChatMessage = async(req, res) => {
    try {
        const {userId} = req.auth();

        const {to_user_id} = req.body;

        const messages = await Message.find({
            $or:[
                {from_user_id: userId, to_user_id},
                {from_user_id: to_user_id, to_user_id: userId},

            ]
        }).sort({createdAt: -1})

        //mark seen
        await Message.updateMany({from_user_id: to_user_id, to_user_id: userId},{seen:true})

        res.json({
            success: true,
            messages
        })

    } catch (error) {
        res.json({
            success: false,
            message: error.message
        })
    }
}

//get user recent message
export const getUserRecentMessages = async(req, res) => {
    try {
        const {userId} = req.auth();

        const messages = await Message.find({to_user_id: userId}).populate('from_user_id, to_user_id').sort({createdAt: -1});
        
        res.json({
            success: true,
            messages
        })


    } catch (error) {
        res.json({
            success: false,
            message: error.message,
        })
    }
}
