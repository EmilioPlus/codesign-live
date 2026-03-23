import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"

export type ChatMessage = {
  id: string
  text: string
  userName: string
  clientId: string
  timestamp: number
}

const MAX_MESSAGES = 300

export type Forum = {
  id: string
  streamId: string
  createdBy: string
  title: string
  description: string
  type: "poll" | "discussion"
  options: { id: string; text: string }[]
  createdAt: string
  expiresAt: string
  status: "active" | "closed"
}

export type ProjectFile = {
  id: string
  userId: string
  title: string
  fileUrl: string
  type: "2d" | "3d"
  createdAt: number
}

type StreamRoomContextValue = {
  streamId: string | null
  setBroadcasterStreamId: (id: string | null) => void
  messages: ChatMessage[]
  addMessage: (msg: Omit<ChatMessage, "id">) => void
  sendMessage: (text: string, userName: string) => void
  registerWs: (ws: WebSocket | null) => void
  activeForum: Forum | null
  setActiveForum: (forum: Forum | null) => void
  sendForumUpdate: (forumId: string) => void
  isCreatingForum: boolean
  setIsCreatingForum: (v: boolean) => void
  sendForumCreated: (forum: Forum) => void
  activeProject: ProjectFile | null
  setActiveProject: (p: ProjectFile | null) => void
}

const StreamRoomContext = createContext<StreamRoomContextValue | null>(null)

export function StreamRoomProvider({
  children,
  streamIdFromParams,
}: {
  children: ReactNode
  streamIdFromParams: string | null
}) {
  const [broadcasterStreamId, setBroadcasterStreamId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeForum, setActiveForum] = useState<Forum | null>(null)
  const [isCreatingForum, setIsCreatingForum] = useState(false)
  const [activeProject, setActiveProject] = useState<ProjectFile | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const streamId = streamIdFromParams ?? broadcasterStreamId

  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => {
      const next = [...prev, { ...msg, id: `${msg.clientId}-${msg.timestamp}` }]
      if (next.length > MAX_MESSAGES) return next.slice(-MAX_MESSAGES)
      return next
    })
  }, [])

  const sendMessage = useCallback((text: string, userName: string) => {
    if (!streamId || !text.trim()) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(
      JSON.stringify({
        type: "chat",
        streamId,
        text: text.trim(),
        userName: userName || "Anónimo",
      })
    )
  }, [streamId])

  const registerWs = useCallback((ws: WebSocket | null) => {
    wsRef.current = ws
  }, [])

  const sendForumUpdate = useCallback((forumId: string) => {
    if (!streamId) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: "forum-update", streamId, forumId }))
  }, [streamId])

  const sendForumCreated = useCallback((forum: Forum) => {
    if (!streamId) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: "forum-created", streamId, forum }))
  }, [streamId])

  const value: StreamRoomContextValue = {
    streamId,
    setBroadcasterStreamId,
    messages,
    addMessage,
    sendMessage,
    registerWs,
    activeForum,
    setActiveForum,
    sendForumUpdate,
    isCreatingForum,
    setIsCreatingForum,
    sendForumCreated,
    activeProject,
    setActiveProject,
  }

  return (
    <StreamRoomContext.Provider value={value}>
      {children}
    </StreamRoomContext.Provider>
  )
}

export function useStreamRoom() {
  const ctx = useContext(StreamRoomContext)
  if (!ctx) throw new Error("useStreamRoom must be used within StreamRoomProvider")
  return ctx
}

export function useStreamRoomOptional() {
  return useContext(StreamRoomContext)
}
