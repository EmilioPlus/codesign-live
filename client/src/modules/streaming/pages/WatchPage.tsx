import { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useStreamRoom } from "../../../context/StreamRoomContext"
import { getActiveForumApi, WS_URL } from "../../../services/api"
import ProjectViewerOverlay from "../components/ProjectViewerOverlay"

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}

export default function WatchPage() {
  const { streamId } = useParams()
  const { addMessage, registerWs, setActiveForum } = useStreamRoom()
  const mainVideoRef = useRef<HTMLVideoElement>(null)
  const overlayVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const broadcasterIdRef = useRef<string | null>(null)
  const assignedStreamsRef = useRef<Set<MediaStream>>(new Set())
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    if (!streamId) return
    let isCleanedUp = false
    assignedStreamsRef.current = new Set()
    pendingIceCandidatesRef.current = []

    const pc = new RTCPeerConnection(rtcConfig)
    pcRef.current = pc

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (!remoteStream || event.track.kind !== "video") return
      if (assignedStreamsRef.current.has(remoteStream)) return
      assignedStreamsRef.current.add(remoteStream)
      
      const isScreen = assignedStreamsRef.current.size === 1
      const videoEl = isScreen ? mainVideoRef.current : overlayVideoRef.current
      if (videoEl) {
        videoEl.srcObject = remoteStream
        videoEl.play().catch(console.error)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (!broadcasterIdRef.current) return
        wsRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            streamId,
            targetId: broadcasterIdRef.current,
            candidate: event.candidate,
          })
        )
      }
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      registerWs(ws)
      ws.send(
        JSON.stringify({
          type: "join",
          role: "viewer",
          streamId,
        })
      )
      getActiveForumApi(streamId).then(({ forum }) => setActiveForum(forum))
    }

    ws.onmessage = async (event) => {
      let msg: any
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (msg.streamId !== streamId) return

      if (msg.type === "chat-message") {
        addMessage({
          text: msg.text,
          userName: msg.userName ?? "Anónimo",
          clientId: msg.clientId,
          timestamp: msg.timestamp ?? Date.now(),
        })
        return
      }

      if (msg.type === "forum-created" && msg.forum) {
        setActiveForum(msg.forum)
        return
      }
      if (msg.type === "forum-update" && msg.forumId) {
        getActiveForumApi(streamId).then(({ forum }) => setActiveForum(forum))
        return
      }
      if (msg.type === "stream-ended") {
        setError("La transmisión ha finalizado.")
        setActiveForum(null)
        return
      }

      if (msg.type === "offer" && msg.sdp) {
        broadcasterIdRef.current = msg.fromId as string
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          
          while (pendingIceCandidatesRef.current.length > 0) {
            const cand = pendingIceCandidatesRef.current.shift()
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand))
          }

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          ws.send(
            JSON.stringify({
              type: "answer",
              streamId,
              targetId: broadcasterIdRef.current,
              sdp: answer,
            })
          )
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "No se pudo establecer la conexión de video"
          setError(message)
        }
        return
      }

      if (msg.type === "ice-candidate" && msg.candidate) {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
          } else {
            pendingIceCandidatesRef.current.push(msg.candidate)
          }
        } catch {
          // ignore
        }
        return
      }
    }

    ws.onerror = () => {
      if (!isCleanedUp) setError("Error en la conexión de streaming.")
    }

    ws.onclose = () => {
      if (!isCleanedUp) setError("Conexión perdida.")
    }

    return () => {
      isCleanedUp = true
      registerWs(null)
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      wsRef.current = null
      pc.close()
      pcRef.current = null
    }
  }, [streamId, addMessage, registerWs, setActiveForum])

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-copy flex items-center justify-between">
          Transmisión en vivo
          <button 
            type="button" 
            onClick={() => setIsMuted(m => !m)} 
            className="text-sm px-3 py-1.5 rounded-lg bg-surface-muted border border-border hover:bg-surface transition-colors"
          >
            {isMuted ? "🔇 Activar Sonido" : "🔊 Silenciar"}
          </button>
        </h2>
        <p className="text-copy-muted text-sm">
          Estás viendo esta transmisión en tiempo real.
        </p>
      </div>

      {/* Contenedor del video con el mismo estilo del StreamPlayer (sin bordes grandes) */}
      <div className="flex-1 min-h-[400px] flex items-center justify-center bg-surface-muted rounded-lg overflow-hidden relative">
        <ProjectViewerOverlay />
        <video
          ref={mainVideoRef}
          autoPlay
          playsInline
          muted={isMuted}
          controls={false}
          className="w-full h-full object-contain rounded-lg"
        />
        <video
          ref={overlayVideoRef}
          autoPlay
          playsInline
          muted={isMuted}
          controls={false}
          className="absolute bottom-4 right-4 w-48 h-32 rounded-lg border border-border bg-black shadow-lg object-cover z-10"
        />
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <p className="text-sm text-danger font-medium bg-surface-panel/90 border border-danger/50 rounded-full px-4 py-2 shadow-xl backdrop-blur-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              {error}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-start">
        <Link
          to="/"
          className="px-4 py-2 rounded-lg bg-surface-panel text-copy text-sm font-medium hover:bg-surface border border-border transition-colors w-fit"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
