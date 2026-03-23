import { Navigate, Outlet, useParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { StreamRoomProvider } from "../context/StreamRoomContext"
import SidebarProjects from "../modules/streaming/components/SidebarProjects"
import ChatPanel from "../modules/streaming/components/ChatPanel"
import ForumPanel from "../modules/streaming/components/ForumPanel"
import CreateForumPanel from "../modules/streaming/components/CreateForumPanel"

export default function StreamLayout() {
  const { isAuthenticated } = useAuth()
  const { streamId: streamIdFromParams } = useParams()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <StreamRoomProvider streamIdFromParams={streamIdFromParams ?? null}>
      <div className="h-screen grid grid-cols-[280px_minmax(0,1fr)_320px] bg-surface">
        <aside className="h-full border-r border-border">
          <SidebarProjects />
        </aside>

        <main className="h-full">
          <div className="h-full p-6">
            <Outlet />
          </div>
        </main>

        <aside className="h-full border-l border-border flex flex-col min-w-0">
          <ForumPanel />
          <CreateForumPanel />
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatPanel />
          </div>
        </aside>
      </div>
    </StreamRoomProvider>
  )
}