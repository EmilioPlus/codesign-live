import { useRef, useState, useCallback, useEffect } from "react"
import { createStreamApi, endStreamApi } from "../../../services/api"
import StudioPanels, { type SceneId } from "./studio/StudioPanels"

export default function StreamPlayer() {
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamIdRef = useRef<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [micMuted, setMicMuted] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState<SceneId>("gameplay")

  // Asignar stream de pantalla al video cuando el elemento ya está en el DOM (isStreaming=true)
  useEffect(() => {
    if (!isStreaming || !screenStreamRef.current || !screenVideoRef.current) return
    screenVideoRef.current.srcObject = screenStreamRef.current
    screenVideoRef.current.play().catch(() => {})
  }, [isStreaming])

  // Asignar stream de cámara al overlay cuando el elemento ya está en el DOM (cameraOn=true)
  useEffect(() => {
    if (!cameraOn || !cameraStreamRef.current || !cameraVideoRef.current) return
    cameraVideoRef.current.srcObject = cameraStreamRef.current
    cameraVideoRef.current.play().catch(() => {})
  }, [cameraOn])

  const rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  }

  const sendSignal = useCallback((msg: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const startScreenCapture = useCallback(async () => {
    const mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    })
    screenStreamRef.current = mediaStream
    mediaStream.getVideoTracks()[0].onended = () => {
      stopStream()
    }
  }, [])

  const toggleCamera = useCallback(async () => {
    try {
      if (cameraOn) {
        cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
        cameraStreamRef.current = null
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = null
        }
        setCameraOn(false)
        return
      }

      const camStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      cameraStreamRef.current = camStream
      camStream.getAudioTracks().forEach((track) => {
        track.enabled = !micMuted
      })
      setCameraOn(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo activar la cámara"
      setError(message)
    }
  }, [cameraOn, micMuted])

  const toggleMic = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev
      cameraStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !next
      })
      return next
    })
  }, [])

  const createPeerForViewer = useCallback(
    async (viewerId: string) => {
      if (!screenStreamRef.current || !streamIdRef.current) return
      if (peersRef.current.has(viewerId)) return

      const pc = new RTCPeerConnection(rtcConfig)

      screenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, screenStreamRef.current as MediaStream)
      })
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, cameraStreamRef.current as MediaStream)
        })
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice-candidate",
            streamId: streamIdRef.current,
            targetId: viewerId,
            candidate: event.candidate,
          })
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal({
        type: "offer",
        streamId: streamIdRef.current,
        targetId: viewerId,
        sdp: offer,
      })

      peersRef.current.set(viewerId, pc)
    },
    [rtcConfig, sendSignal]
  )

  const handleSignalMessage = useCallback(
    async (event: MessageEvent) => {
      let msg: any
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (!streamIdRef.current || msg.streamId !== streamIdRef.current) return

      if (msg.type === "viewer-joined") {
        await createPeerForViewer(msg.viewerId as string)
        return
      }

      if (msg.type === "answer") {
        const fromId = msg.fromId as string
        const pc = peersRef.current.get(fromId)
        if (!pc || !msg.sdp) return
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        return
      }

      if (msg.type === "ice-candidate") {
        const fromId = msg.fromId as string
        const pc = peersRef.current.get(fromId)
        if (!pc || !msg.candidate) return
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
        } catch {
          // ignore ice errors
        }
        return
      }
    },
    [createPeerForViewer]
  )

  const connectSignaling = useCallback(() => {
    if (!streamIdRef.current || wsRef.current) return
    const ws = new WebSocket("ws://localhost:4000/ws")
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          role: "broadcaster",
          streamId: streamIdRef.current,
        })
      )
    }
    ws.onmessage = handleSignalMessage
    ws.onerror = () => {
      // opcional: mostrar error de señalización
    }
    ws.onclose = () => {
      wsRef.current = null
      peersRef.current.forEach((pc) => pc.close())
      peersRef.current.clear()
    }
    wsRef.current = ws
  }, [handleSignalMessage])

  const startStream = useCallback(async () => {
    setError(null)
    setStarting(true)
    try {
      const { stream } = await createStreamApi()
      streamIdRef.current = stream.id

      await startScreenCapture()
       connectSignaling()
      setIsStreaming(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo iniciar la transmisión"
      setError(message)
    } finally {
      setStarting(false)
    }
  }, [startScreenCapture])

  const stopStream = useCallback(async () => {
    const sid = streamIdRef.current
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
    cameraStreamRef.current = null
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
    }
    streamIdRef.current = null
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    peersRef.current.forEach((pc) => pc.close())
    peersRef.current.clear()
    setIsStreaming(false)
    setCameraOn(false)
    setError(null)
    if (sid) {
      try {
        await endStreamApi(sid)
      } catch {
        // ya detuvimos el stream localmente
      }
    }
  }, [isRecording])

  const startRecording = useCallback(() => {
    const baseStream = screenStreamRef.current
    if (!baseStream || isRecording) return

    const tracks: MediaStreamTrack[] = [...baseStream.getTracks()]
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getAudioTracks().forEach((t) => tracks.push(t))
    }

    recordedChunksRef.current = []
    const recorder = new MediaRecorder(new MediaStream(tracks))
    mediaRecorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `codesign-live-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
      mediaRecorderRef.current = null
    }
    recorder.start(1000)
    setIsRecording(true)
  }, [isRecording])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [])

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Área de video (Preview / Canvas) */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-surface-muted rounded-lg overflow-hidden relative">
        {!isStreaming ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
            <p className="text-copy-muted">
              Inicia la transmisión para compartir tu pantalla
            </p>
            <p className="text-sm text-copy-muted/80">
              Podrás grabar la sesión desde los controles
            </p>
          </div>
        ) : (
          <>
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain rounded-lg"
            />
            {cameraOn && (
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-48 h-32 rounded-lg border border-border bg-black object-cover shadow-lg"
              />
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Barra de controles (tipo panel OBS) */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-panel rounded-lg border border-border">
        {!isStreaming ? (
          <button
            type="button"
            onClick={startStream}
            disabled={starting}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {starting ? "Iniciando..." : "Iniciar transmisión de pantalla"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={stopStream}
              className="px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm font-medium hover:bg-surface hover:border-border border border-border transition-colors"
            >
              Detener transmisión
            </button>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm font-medium hover:bg-surface border border-border transition-colors"
              >
                Grabar sesión
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger-hover transition-colors"
              >
                Detener grabación
              </button>
            )}
            {isRecording && (
              <span className="text-sm text-copy-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                Grabando…
              </span>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleCamera}
                className="px-3 py-1.5 rounded-lg bg-surface-muted text-copy text-xs font-medium hover:bg-surface border border-border transition-colors"
              >
                {cameraOn ? "Ocultar cámara" : "Mostrar cámara"}
              </button>
              <button
                type="button"
                onClick={toggleMic}
                disabled={!cameraOn}
                className="px-3 py-1.5 rounded-lg bg-surface-muted text-copy text-xs font-medium hover:bg-surface border border-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {micMuted ? "Activar micrófono" : "Silenciar micrófono"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Paneles estilo OBS: Escenas, Fuentes, Audio */}
      <StudioPanels
        activeSceneId={activeSceneId}
        onSceneChange={setActiveSceneId}
        isStreaming={isStreaming}
        cameraOn={cameraOn}
        micMuted={micMuted}
        onToggleCamera={toggleCamera}
        onToggleMic={toggleMic}
      />
    </div>
  )
}
