import { createBrowserRouter, Navigate } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import StreamLayout from "../layouts/StreamLayout"
import Home from "../pages/Home/home"
import Login from "../pages/Login/login"
import Register from "../pages/Register/register"
import VerifyEmail from "../pages/VerifyEmail/verify"
import { ResetPassword } from "../pages/ResetPassword/reset"
import Profile from "../pages/Profile/profile"
import AdminDashboard from "../pages/AdminDashboard/AdminDashboard"
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
      { path: "auth/verify/:userId/:token", element: <VerifyEmail /> },
      { path: "auth/reset/:userId/:token", element: <ResetPassword /> },
      { path: "profile", element: <Profile /> },
      { path: "admin", element: <AdminDashboard /> },
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
