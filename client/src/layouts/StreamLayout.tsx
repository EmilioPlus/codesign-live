import { useState } from "react"
import { Navigate, Outlet, useParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { StreamRoomProvider } from "../context/StreamRoomContext"
import SidebarProjects from "../modules/streaming/components/SidebarProjects"
import ChatPanel from "../modules/streaming/components/ChatPanel"
import ForumPanel from "../modules/streaming/components/ForumPanel"
import CreateForumPanel from "../modules/streaming/components/CreateForumPanel"

type Tab = "projects" | "stream" | "chat"

export default function StreamLayout() {
  const { isAuthenticated } = useAuth()
  const { streamId: streamIdFromParams } = useParams()
  const [activeTab, setActiveTab] = useState<Tab>("stream")

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <StreamRoomProvider streamIdFromParams={streamIdFromParams ?? null}>

      {/* ── Desktop (lg+): 3 columnas ─────────────────────────────────────── */}
      <div className="hidden lg:grid h-screen overflow-hidden grid-cols-[260px_minmax(0,1fr)_320px] bg-surface">
        <aside className="h-full border-r border-border min-h-0 overflow-hidden">
          <SidebarProjects />
        </aside>
        <main className="h-full min-h-0 min-w-0 flex flex-col">
          <div className="flex-1 p-6 min-h-0 overflow-y-auto">
            <Outlet />
          </div>
        </main>
        <aside className="h-full border-l border-border flex flex-col min-w-0 min-h-0">
          <ForumPanel />
          <CreateForumPanel />
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatPanel />
          </div>
        </aside>
      </div>

      {/* ── Tablet (md–lg): 2 columnas — sidebar + main, chat como tab ─── */}
      <div className="hidden md:grid lg:hidden h-screen overflow-hidden grid-cols-[220px_minmax(0,1fr)] bg-surface">
        <aside className="h-full border-r border-border min-h-0 overflow-hidden">
          <SidebarProjects />
        </aside>
        <div className="h-full min-h-0 flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-border bg-surface-panel shrink-0">
            <button
              onClick={() => setActiveTab("stream")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${activeTab === "stream" ? "text-brand border-b-2 border-brand" : "text-copy-muted hover:text-copy"}`}
            >
              📺 Transmisión
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${activeTab === "chat" ? "text-brand border-b-2 border-brand" : "text-copy-muted hover:text-copy"}`}
            >
              💬 Chat
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "stream" ? (
              <main className="h-full overflow-y-auto p-4">
                <ForumPanel />
                <CreateForumPanel />
                <Outlet />
              </main>
            ) : (
              <div className="h-full flex flex-col">
                <ChatPanel />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Móvil (<md): Una columna con 3 tabs ───────────────────────────── */}
      <div className="md:hidden flex flex-col h-screen overflow-hidden bg-surface">
        {/* Tab bar fijo abajo */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "projects" && (
            <div className="h-full overflow-hidden">
              <SidebarProjects />
            </div>
          )}
          {activeTab === "stream" && (
            <main className="h-full overflow-y-auto p-3">
              <ForumPanel />
              <CreateForumPanel />
              <Outlet />
            </main>
          )}
          {activeTab === "chat" && (
            <div className="h-full flex flex-col">
              <ChatPanel />
            </div>
          )}
        </div>

        {/* Barra de tabs en la parte inferior (estilo app móvil) */}
        <nav className="shrink-0 grid grid-cols-3 border-t border-border bg-surface-panel safe-area-bottom">
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${activeTab === "projects" ? "text-brand" : "text-copy-muted"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Proyectos
          </button>
          <button
            onClick={() => setActiveTab("stream")}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${activeTab === "stream" ? "text-brand" : "text-copy-muted"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Transmisión
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${activeTab === "chat" ? "text-brand" : "text-copy-muted"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat
          </button>
        </nav>
      </div>

    </StreamRoomProvider>
  )
}