import { createBrowserRouter, Navigate } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import StreamLayout from "../layouts/StreamLayout"
import Home from "../pages/Home/home"
import Login from "../pages/Login/login"
import Register from "../pages/Register/register"
import Profile from "../pages/Profile/profile"
import StreamPage from "../modules/streaming/pages/StreamPage"
import WatchPage from "../modules/streaming/pages/WatchPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "profile", element: <Profile /> },
    ],
  },
  {
    path: "/stream",
    element: <StreamLayout />,
    children: [
      { index: true, element: <StreamPage /> },
      { path: ":streamId", element: <WatchPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])
