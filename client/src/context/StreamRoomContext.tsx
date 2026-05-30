import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
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

export type ExclusiveUser = {
  clientId: string
  userName: string
}

export type CanvasStroke = {
  id: string
  points: { x: number; y: number }[]
}

type StreamRoomContextValue = {
  streamId: string | null
  setBroadcasterStreamId: (id: string | null) => void
  messages: ChatMessage[]
  addMessage: (msg: Omit<ChatMessage, "id">) => void
  sendMessage: (text: string, userName: string) => void
  sendReaction: (emoji: string, userName: string) => void
  sendFileMessage: (payload: { fileUrl: string; fileName: string; fileType: string; userName: string }) => void
  registerWs: (ws: WebSocket | null) => void
  activeForum: Forum | null
  setActiveForum: (forum: Forum | null) => void
  sendForumUpdate: (forumId: string) => void
  isCreatingForum: boolean
  setIsCreatingForum: (v: boolean) => void
  sendForumCreated: (forum: Forum) => void
  activeProject: ProjectFile | null
  setActiveProject: (p: ProjectFile | null) => void
  exclusiveUser: ExclusiveUser | null
  setExclusiveUser: (user: ExclusiveUser | null) => void
  inviteExclusiveViewer: (clientId: string, userName: string, broadcasterName?: string) => void
  revokeExclusiveViewer: (clientId?: string) => void
  strokes: CanvasStroke[]
  addStroke: (stroke: CanvasStroke) => void
  clearStrokes: () => void
  setStrokes: (strokes: CanvasStroke[]) => void
  sendDrawStroke: (stroke: CanvasStroke) => void
  sendClearCanvas: () => void
  viewerCount: number
  setViewerCount: (count: number) => void
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
  const [exclusiveUser, setExclusiveUser] = useState<ExclusiveUser | null>(null)
  const [strokes, setStrokes] = useState<CanvasStroke[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  // Set of msgIds already rendered — absolute guard against duplicates
  const seenMsgIdsRef = useRef<Set<string>>(new Set())

  const streamId = streamIdFromParams ?? broadcasterStreamId

  // Reset room state when streamId changes to prevent leaks and old messages showing up
  useEffect(() => {
    setMessages([])
    setActiveForum(null)
    setExclusiveUser(null)
    setStrokes([])
    seenMsgIdsRef.current = new Set()
  }, [streamId])

  const addMessage = useCallback((msg: Omit<ChatMessage, "id"> & { msgId?: string }) => {
    const timestamp = msg.timestamp ?? Date.now()
    const msgId = (msg as any).msgId as string | undefined

    if (msgId) {
      // Server-originated message: use the server's unique msgId as the absolute dedup key.
      // If this ID has already been rendered (e.g. from a second WS mount in StrictMode), drop it.
      if (seenMsgIdsRef.current.has(msgId)) return
      seenMsgIdsRef.current.add(msgId)
      // Evict old entries to avoid unbounded memory growth
      if (seenMsgIdsRef.current.size > MAX_MESSAGES * 2) {
        const arr = Array.from(seenMsgIdsRef.current)
        seenMsgIdsRef.current = new Set(arr.slice(-MAX_MESSAGES))
      }
    }

    setMessages((prev) => {
      // Fallback guard for optimistic messages (no msgId): same text+user within 3 s
      if (!msgId) {
        const isDuplicate = prev.some(
          (m) =>
            m.userName.trim().toLowerCase() === msg.userName.trim().toLowerCase() &&
            m.text.trim() === msg.text.trim() &&
            Math.abs((m.timestamp || 0) - timestamp) < 3000
        )
        if (isDuplicate) return prev
      }

      const next = [
        ...prev,
        {
          ...msg,
          timestamp,
          id: msgId ?? `${msg.clientId || "opt"}-${timestamp}-${Math.random().toString(36).slice(2)}`,
        },
      ]
      if (next.length > MAX_MESSAGES) return next.slice(-MAX_MESSAGES)
      return next
    })
  }, [])

  const sendMessage = useCallback((text: string, userName: string) => {
    if (!streamId || !text.trim()) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const trimmed = text.trim()
    const timestamp = Date.now()

    // Optimistic local add — no msgId so dedup uses text+user+time window.
    // The server skips echoing back to the sender, so this is the only copy the sender sees.
    addMessage({
      text: trimmed,
      userName: userName || "Anónimo",
      clientId: "__local__",
      timestamp,
    })

    ws.send(
      JSON.stringify({
        type: "chat",
        streamId,
        text: trimmed,
        userName: userName || "Anónimo",
      })
    )
  }, [streamId, addMessage])

  const sendReaction = useCallback((emoji: string, userName: string) => {
    if (!streamId) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(
      JSON.stringify({
        type: "reaction",
        streamId,
        emoji,
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

  const sendFileMessage = useCallback((p: { fileUrl: string; fileName: string; fileType: string; userName: string }) => {
    if (!streamId) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const timestamp = Date.now()
    // Optimistic local insert — server no longer echoes back to sender
    addMessage({
      text: "",
      userName: p.userName || "Anónimo",
      clientId: "__local__",
      timestamp,
      fileUrl: p.fileUrl,
      fileName: p.fileName,
      fileType: p.fileType,
    } as any)
    ws.send(JSON.stringify({
      type: "file-message",
      streamId,
      fileUrl: p.fileUrl,
      fileName: p.fileName,
      fileType: p.fileType,
      userName: p.userName,
    }))
  }, [streamId, addMessage])

  const inviteExclusiveViewer = useCallback((targetId: string, viewerName: string, broadcasterName?: string) => {
    if (!streamId) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: "invite-exclusive",
      targetId,
      targetName: viewerName,
      streamId,
      userName: broadcasterName || "El transmisor"
    }))
  }, [streamId])

  const revokeExclusiveViewer = useCallback((targetId?: string) => {
    if (!streamId) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const idToRevoke = targetId || exclusiveUser?.clientId
    if (idToRevoke) {
      ws.send(JSON.stringify({ type: "revoke-exclusive", targetId: idToRevoke, streamId }))
    }
  }, [streamId, exclusiveUser])

  const addStroke = useCallback((stroke: CanvasStroke) => {
    setStrokes((prev) => [...prev, stroke])
  }, [])

  const clearStrokes = useCallback(() => {
    setStrokes([])
  }, [])

  const [viewerCount, setViewerCount] = useState(0)

  const sendDrawStroke = useCallback((stroke: CanvasStroke) => {
    if (!streamId) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: "draw-stroke", streamId, stroke }))
  }, [streamId])

  const sendClearCanvas = useCallback(() => {
    if (!streamId) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: "clear-canvas", streamId }))
  }, [streamId])

  const value: StreamRoomContextValue = {
    streamId,
    setBroadcasterStreamId,
    messages,
    addMessage,
    sendMessage,
    sendReaction,
    sendFileMessage,
    registerWs,
    activeForum,
    setActiveForum,
    sendForumUpdate,
    isCreatingForum,
    setIsCreatingForum,
    sendForumCreated,
    activeProject,
    setActiveProject,
    exclusiveUser,
    setExclusiveUser,
    inviteExclusiveViewer,
    revokeExclusiveViewer,
    strokes,
    addStroke,
    clearStrokes,
    setStrokes,
    sendDrawStroke,
    sendClearCanvas,
    viewerCount,
    setViewerCount,
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
