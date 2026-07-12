import { useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useUser, useAuth } from "@clerk/react";
import toast, { Toaster } from "react-hot-toast";
import { useSelector, useDispatch } from "react-redux";

import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import ChatBox from "./pages/ChatBox";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import Layout from "./pages/Layout";

import { fetchUser } from "./features/user/userSlice.js";
import { fetchConnections } from "./features/connections/connectionSlice.js";
import { addMessage } from "./features/messages/messagesSlice.js";

import Notification from "./components/Notification.jsx";
import api from "./api/axios.js";

function App() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const dispatch = useDispatch();

  const currentUser = useSelector((state) => state.user.value);

  const location = useLocation();
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const token = await getToken();

      dispatch(fetchUser(token));
      dispatch(fetchConnections(token));
    };

    fetchData();
  }, [user, getToken, dispatch]);

  useEffect(() => {
    //console.log("APP SSE EFFECT RUNNING", currentUser?._id);
    if (!currentUser?._id) return;

    const eventSource = new EventSource(
      `${api.defaults.baseURL}/api/message/${currentUser._id}`
    );

    eventSource.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "connected") {
          //console.log("SSE connected");
          return;
        }

        if (!message.from_user_id || !message.to_user_id) {
          //console.log("Invalid SSE message:", message);
          return;
        }


        const senderId =
          typeof message.from_user_id === "object"
            ? message.from_user_id._id
            : message.from_user_id;

        if (!senderId) {
          //console.log("Sender id missing:", message);
          return;
        }


        const isCurrentChatOpen =
          pathnameRef.current === `/messages/${senderId}`;

        if (isCurrentChatOpen) {
          console.log('INSIE CURRENTCHAT OPEN')
          dispatch(addMessage({
            ...message,
            seen: true,
          }));

          const token = await getToken();

          const { data } = await api.post(
            "/api/message/seen",
            {
              from_user_id: senderId,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          //console.log("MARK SEEN RESPONSE:", data);

        } else {
          toast.custom(
            (t) => (
              <Notification
                t={t}
                message={message}
              />
            ),
            {
              duration: 6000,
              position: "bottom-right",
            }
          );
        }
      } catch (error) {
        console.log("SSE message error:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.log("SSE connection error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser?._id, dispatch]);

  return (
    <>
      <Toaster />

      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:userId" element={<ChatBox />} />
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:profileId" element={<Profile />} />
          <Route path="create-post" element={<CreatePost />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;