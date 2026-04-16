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
  
  // Exclusividad
  const exclusivePcRef = useRef<RTCPeerConnection | null>(null)
  const exclusiveMicRef = useRef<MediaStream | null>(null)
  const pendingExclusiveIceRef = useRef<RTCIceCandidateInit[]>([])
  const pointerAllowedRef = useRef(false)
  const lastPointerSentRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)

  // Estado para Modal de Invitación
  const [inviteFromId, setInviteFromId] = useState<string | null>(null)
  const [inviteUserName, setInviteUserName] = useState<string>("")

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pointerAllowedRef.current || !exclusivePcRef.current) return
    
    // Throttle de 50ms para no saturar al enviarlo (20 fps max)
    const now = Date.now()
    if (now - lastPointerSentRef.current < 50) return
    lastPointerSentRef.current = now

    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    
    if (wsRef.current?.readyState === WebSocket.OPEN && broadcasterIdRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "pointer-move",
        streamId,
        targetId: broadcasterIdRef.current,
        x,
        y
      }))
    }
  }

  const acceptExclusiveInvite = async () => {
    if (!inviteFromId) return
    const targetBroadcaster = inviteFromId
    setInviteFromId(null)
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      exclusiveMicRef.current = micStream
      const excPc = new RTCPeerConnection(rtcConfig)
      exclusivePcRef.current = excPc

      excPc.onicecandidate = (e) => {
        if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "exclusive-ice-candidate",
            streamId,
            targetId: targetBroadcaster,
            candidate: e.candidate
          }))
        }
      }

      micStream.getAudioTracks().forEach(track => excPc.addTrack(track, micStream))

      const offer = await excPc.createOffer()
      await excPc.setLocalDescription(offer)

      wsRef.current?.send(JSON.stringify({
        type: "exclusive-offer",
        streamId,
        targetId: targetBroadcaster,
        sdp: offer
      }))
    } catch (err) {
      alert("No se pudo acceder al micrófono. Verifica los permisos.")
    }
  }

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

      if (msg.type === "invite-exclusive") {
        setInviteFromId(msg.fromId || msg.clientId || broadcasterIdRef.current)
        setInviteUserName(msg.userName || "El transmisor")
        return
      }

      if (msg.type === "exclusive-answer" && msg.sdp) {
        const excPc = exclusivePcRef.current
        if (excPc) {
          await excPc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          while (pendingExclusiveIceRef.current.length > 0) {
            const cand = pendingExclusiveIceRef.current.shift()
            if (cand) await excPc.addIceCandidate(new RTCIceCandidate(cand))
          }
        }
        return
      }

      if (msg.type === "exclusive-ice-candidate" && msg.candidate) {
        const excPc = exclusivePcRef.current
        if (excPc) {
          if (excPc.remoteDescription) {
            await excPc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(()=>{})
          } else {
            pendingExclusiveIceRef.current.push(msg.candidate)
          }
        }
        return
      }

      if (msg.type === "revoke-exclusive") {
        if (exclusiveMicRef.current) {
          exclusiveMicRef.current.getTracks().forEach(t => t.stop())
          exclusiveMicRef.current = null
        }
        if (exclusivePcRef.current) {
          exclusivePcRef.current.close()
          exclusivePcRef.current = null
        }
        pointerAllowedRef.current = false
        alert("El transmisor ha cerrado el canal exclusivo.")
        return
      }

      if (msg.type === "pointer-permission") {
        pointerAllowedRef.current = msg.allowed
        return
      }

      if (msg.type === "viewer-count") {
        setViewerCount(msg.count ?? 0)
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
      
      if (exclusiveMicRef.current) {
        exclusiveMicRef.current.getTracks().forEach(t => t.stop())
      }
      if (exclusivePcRef.current) {
        exclusivePcRef.current.close()
      }
    }
  }, [streamId, addMessage, registerWs, setActiveForum])

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-copy flex items-center justify-between">
          <div className="flex items-center gap-3">
            Transmisión en vivo
            {viewerCount > 0 && (
              <span className="text-xs font-medium text-brand px-2 py-1 bg-brand/10 border border-brand/20 rounded-md flex items-center gap-1" title="Espectadores en vivo">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                {viewerCount}
              </span>
            )}
          </div>
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
      <div 
        className={`flex-1 min-h-[400px] flex items-center justify-center bg-surface-muted rounded-lg overflow-hidden relative ${pointerAllowedRef.current ? 'cursor-crosshair' : ''}`}
        onMouseMove={handleMouseMove}
      >
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

        {/* Modal UI para Invitación Exclusiva */}
        {inviteFromId && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 transition-opacity">
            <div className="bg-surface-panel border border-brand/40 shadow-2xl rounded-xl p-6 max-w-sm w-full mx-4 animate-fade-in-up">
              <div className="flex items-center gap-3 text-brand mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
                <h3 className="text-lg font-bold text-copy">Invitación Exclusiva</h3>
              </div>
              <p className="text-copy-muted mb-6 text-sm">
                <b>{inviteUserName}</b> te ha invitado a hablar en vivo en la transmisión principal. Tu micrófono será capturado y transmitido a toda la audiencia. ¿Deseas unirte?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setInviteFromId(null)}
                  className="px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm font-medium hover:bg-surface border border-border transition-colors"
                >
                  Rechazar
                </button>
                <button
                  onClick={acceptExclusiveInvite}
                  className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover shadow-lg shadow-brand/20 transition-colors"
                >
                  Activar Micrófono
                </button>
              </div>
            </div>
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
