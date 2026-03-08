import { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router-dom"

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}

export default function WatchPage() {
  const { streamId } = useParams()
  const mainVideoRef = useRef<HTMLVideoElement>(null)
  const overlayVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const broadcasterIdRef = useRef<string | null>(null)
  const assignedStreamsRef = useRef<Set<MediaStream>>(new Set())
  const closedByCleanupRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!streamId) return
    closedByCleanupRef.current = false
    assignedStreamsRef.current = new Set()

    const pc = new RTCPeerConnection(rtcConfig)
    pcRef.current = pc

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (!remoteStream || event.track.kind !== "video") return
      if (assignedStreamsRef.current.has(remoteStream)) return
      assignedStreamsRef.current.add(remoteStream)
      // Primer stream = pantalla (principal), segundo = cámara (overlay)
      const isScreen = assignedStreamsRef.current.size === 1
      const videoEl = isScreen ? mainVideoRef.current : overlayVideoRef.current
      if (videoEl) {
        videoEl.srcObject = remoteStream
        videoEl.play().catch(() => {})
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

    const ws = new WebSocket("ws://localhost:4000/ws")
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          role: "viewer",
          streamId,
        })
      )
    }

    ws.onmessage = async (event) => {
      let msg: any
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (msg.streamId !== streamId) return

      if (msg.type === "stream-ended") {
        setError("La transmisión ha finalizado.")
        return
      }

      if (msg.type === "offer" && msg.sdp) {
        broadcasterIdRef.current = msg.fromId as string
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
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
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
        } catch {
          // ignore
        }
        return
      }
    }

    ws.onerror = () => {
      if (!closedByCleanupRef.current) setError("Error en la conexión de streaming.")
    }

    ws.onclose = () => {
      if (!closedByCleanupRef.current) setError("Conexión cerrada.")
    }

    return () => {
      closedByCleanupRef.current = true
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      wsRef.current = null
      pc.close()
      pcRef.current = null
    }
  }, [streamId])

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-copy">Transmisión en vivo</h2>
        <p className="text-copy-muted text-sm">
          Estás viendo esta transmisión en tiempo real.
        </p>
      </div>

      <div className="flex-1 bg-surface-panel rounded-lg border border-border flex flex-col items-center justify-center gap-4 relative">
        <video
          ref={mainVideoRef}
          autoPlay
          playsInline
          controls={false}
          className="aspect-video max-w-4xl w-full bg-surface-muted rounded-lg"
        />
        <video
          ref={overlayVideoRef}
          autoPlay
          playsInline
          controls={false}
          className="absolute bottom-4 right-4 w-48 aspect-video bg-surface-muted rounded-lg border border-border shadow-lg object-cover"
        />
        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <Link
          to="/"
          className="px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm hover:bg-surface border border-border"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
