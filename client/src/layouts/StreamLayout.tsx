import { useState, useEffect } from "react"
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

  // Dynamic viewport detection to prevent mounting duplicate Outlets, ChatPanels and WebSockets
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile" | null>(null)

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      if (w >= 1024) {
        setDeviceType("desktop")
      } else if (w >= 768) {
        setDeviceType("tablet")
      } else {
        setDeviceType("mobile")
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (deviceType === null) {
    return (
      <div className="h-screen bg-surface flex items-center justify-center text-copy-muted font-medium">
        Cargando interfaz...
      </div>
    )
  }

  return (
    <StreamRoomProvider streamIdFromParams={streamIdFromParams ?? null}>

      {/* ── Desktop (lg+): 3 columnas ─────────────────────────────────────── */}
      {deviceType === "desktop" && (
        <div className="grid h-screen overflow-hidden grid-cols-[260px_minmax(0,1fr)_320px] bg-surface">
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
      )}

      {/* ── Tablet (md–lg): 2 columnas — sidebar + main, chat como tab ─── */}
      {deviceType === "tablet" && (
        <div className="grid h-screen overflow-hidden grid-cols-[220px_minmax(0,1fr)] bg-surface">
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
      )}

      {/* ── Móvil (<md): Video arriba, Chat abajo ─────────────────────────── */}
      {deviceType === "mobile" && (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-surface pb-safe">
          {/* Sección superior: Video (StreamPlayer / WatchPage) */}
          <div className="shrink-0 border-b border-border relative z-10 bg-surface shadow-sm max-h-[50vh] overflow-y-auto">
            <Outlet />
          </div>
          
          {/* Sección media: Foros (si hay) */}
          <div className="shrink-0 bg-surface-panel z-0">
            <ForumPanel />
            <CreateForumPanel />
          </div>

          {/* Sección inferior: Chat */}
          <div className="flex-1 min-h-0 flex flex-col z-0">
            <ChatPanel />
          </div>

          {/* Botón flotante para Proyectos */}
          <button
            onClick={() => setActiveTab(activeTab === "projects" ? "stream" : "projects")}
            className="absolute bottom-6 right-4 z-50 p-3.5 bg-brand text-white rounded-full shadow-xl shadow-brand/30 hover:scale-105 active:scale-95 transition-all"
            aria-label="Proyectos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>

          {/* Drawer de proyectos (pantalla completa sobrepuesta) */}
          {activeTab === "projects" && (
            <div className="absolute inset-0 z-50 bg-surface flex flex-col animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 border-b border-border flex justify-between items-center bg-surface-panel shadow-sm">
                <h2 className="font-bold text-lg text-copy">Proyectos y Archivos</h2>
                <button onClick={() => setActiveTab("stream")} className="p-2 text-copy-muted hover:text-copy hover:bg-surface-muted rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidebarProjects />
              </div>
            </div>
          )}
        </div>
      )}

    </StreamRoomProvider>
  )
}