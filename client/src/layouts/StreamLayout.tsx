import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import SidebarProjects from "../modules/streaming/components/SidebarProjects"
import ChatPanel from "../modules/streaming/components/ChatPanel"

export default function StreamLayout() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="h-screen grid grid-cols-[280px_minmax(0,1fr)_320px] bg-surface">
      <aside className="h-full border-r border-border">
        <SidebarProjects />
      </aside>

      <main className="h-full">
        <div className="h-full p-6">
          <Outlet />
        </div>
      </main>

      <aside className="h-full border-l border-border">
        <ChatPanel />
      </aside>
    </div>
  )
}