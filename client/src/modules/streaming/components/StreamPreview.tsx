import { useEffect, useRef, useState } from "react"
import { WS_URL } from "../../../services/api"

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}

type StreamPreviewProps = {
  streamId: string
  className?: string
}

/**
 * Muestra la transmisión en vivo del stream en tiempo real (pantalla del transmisor).
 * Se conecta como viewer por WebRTC solo para reproducir el primer stream de video.
 */
export default function StreamPreview({ streamId, className = "" }: StreamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const broadcasterIdRef = useRef<string | null>(null)
  const [hasVideo, setHasVideo] = useState(false)

  useEffect(() => {
    const pc = new RTCPeerConnection(rtcConfig)
    pcRef.current = pc

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (!remoteStream || event.track.kind !== "video") return
      // Solo mostramos el primer stream (pantalla compartida) en el preview de la tarjeta
      if (videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = remoteStream
        videoRef.current.play().catch(() => {})
        setHasVideo(true)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN && broadcasterIdRef.current) {
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

      if (msg.type === "stream-ended") return

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
        } catch {
          // ignore
        }
        return
      }

      if (msg.type === "ice-candidate" && msg.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
        } catch {
          // ignore
        }
      }
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      ws.close()
      wsRef.current = null
      pc.close()
      pcRef.current = null
      broadcasterIdRef.current = null
    }
  }, [streamId])

  return (
    <div className={`relative w-full h-full bg-surface-muted ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-contain"
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-copy-muted text-sm">Conectando...</span>
        </div>
      )}
    </div>
  )
}
