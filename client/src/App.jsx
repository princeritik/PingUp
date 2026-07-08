import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from "./pages/Login"
import Feed from "./pages/Feed"
import Messages from "./pages/Messages"
import ChatBox from "./pages/ChatBox"
import Connections from "./pages/Connections"
import Discover from "./pages/Discover"
import Profile from "./pages/Profile"
import CreatePost from "./pages/CreatePost"
import Layout from './pages/Layout'
import { useUser, useAuth } from "@clerk/react"
import { Toaster } from "react-hot-toast"
import { useEffect } from 'react'



function App() {

  const { user } = useUser();

  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    const printToken = async () => {
      if (!isLoaded || !isSignedIn) return;

      try {
        const token = await getToken({
          skipCache: true,
        });

        console.log("FRESH TOKEN:");
        console.log(token);
      } catch (error) {
        console.error(error);
      }
    };

    printToken();
  }, [isLoaded, isSignedIn, getToken]);
  return (
    <>
      <Toaster />
      <Routes>
        <Route path='/' element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path='messages' element={<Messages />} />
          <Route path='messages/:userId' element={<ChatBox />} />
          <Route path='connections' element={<Connections />} />
          <Route path='discover' element={<Discover />} />
          <Route path='profile' element={<Profile />} />
          <Route path='profile/:userId' element={<Profile />} />
          <Route path='create-post' element={<CreatePost />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
