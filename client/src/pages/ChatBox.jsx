import React, { useState, useRef, useEffect } from "react";
import { ImageIcon, SendHorizonal } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/react";
import api from "../api/axios";
import {
  addMessage,
  resetMessages,
  fetchMessages,
} from "../features/messages/messagesSlice";
import toast from "react-hot-toast";

export default function ChatBox() {
  const { userId } = useParams();
  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(null);

  const messagesEndRef = useRef(null);
  
  const connections = useSelector(
    (state) => state.connections.connections
  );

  const messages = useSelector(
    (state) => state.messages.messages
  );

  const fetchUserMessages = async () => {
    try {
      const token = await getToken();

      dispatch(
        fetchMessages({
          token,
          userId,
        })
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendMessage = async () => {
    try {
      if (!text.trim() && !image) return;

      const token = await getToken();

      const formData = new FormData();

      formData.append("to_user_id", userId);
      formData.append("text", text);

      if (image) {
        formData.append("image", image);
      }

      const { data } = await api.post(
        "/api/message/send",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        setText("");
        setImage(null);

        dispatch(addMessage(data.message));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchUserMessages();

    return () => {
      dispatch(resetMessages());
    };
  }, [userId, dispatch]);

  useEffect(() => {
    if (connections.length > 0 && userId) {
      const selectedUser = connections.find(
        (connection) => connection._id === userId
      );

      setUser(selectedUser || null);
    }
  }, [connections, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading chat...
      </div>
    );
  }

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div
        className="flex items-center gap-2 p-2 md:px-10 xl:pl-42
        bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-300"
      >
        <img
          src={user.profile_picture}
          alt=""
          className="size-8 rounded-full"
        />

        <div>
          <p className="font-medium">{user.full_name}</p>
          <p className="text-sm text-gray-500 -mt-1.5">
            @{user.username}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="p-5 md:px-10 h-full overflow-y-scroll">
        <div className="space-y-4 max-w-4xl mx-auto">
          {sortedMessages.map((message) => {
            const isMyMessage = message.to_user_id === user._id;

            return (
              <div
                key={message._id}
                className={`flex flex-col ${
                  isMyMessage ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`p-2 text-sm max-w-sm bg-white text-slate-700 rounded-lg shadow
                  ${
                    isMyMessage
                      ? "rounded-br-none"
                      : "rounded-bl-none"
                  }`}
                >
                  {message.message_type === "image" && (
                    <img
                      src={message.media_url}
                      alt=""
                      className="w-full max-w-sm rounded-lg mb-1"
                    />
                  )}

                  {message.text && <p>{message.text}</p>}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4">
        <div
          className="flex items-center gap-3 pl-5 p-1.5 bg-white w-full
          max-w-xl mx-auto border border-gray-200 shadow rounded-full mb-5"
        >
          <input
            type="text"
            className="flex-1 outline-none text-slate-700"
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            onChange={(e) => setText(e.target.value)}
            value={text}
          />

          <label htmlFor="image">
            {image ? (
              <img
                src={URL.createObjectURL(image)}
                className="h-8 rounded cursor-pointer"
                alt=""
              />
            ) : (
              <ImageIcon className="size-7 text-gray-400 cursor-pointer" />
            )}

            <input
              type="file"
              id="image"
              accept="image/*"
              hidden
              onChange={(e) => setImage(e.target.files?.[0])}
            />
          </label>

          <button
            onClick={sendMessage}
            className="bg-gradient-to-br from-indigo-500 to-purple-600
            hover:from-indigo-700 hover:to-purple-800 active:scale-95
            cursor-pointer text-white p-2 rounded-full"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}