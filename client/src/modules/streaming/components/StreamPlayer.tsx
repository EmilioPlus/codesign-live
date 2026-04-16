import { useRef, useState, useCallback, useEffect } from "react"
import {
  createStreamApi,
  endStreamApi,
  updateStreamMetadataApi,
  getForumResultsApi,
  uploadFileApi,
  type ForumResults,
  WS_URL,
} from "../../../services/api"
import { useStreamRoom } from "../../../context/StreamRoomContext"
import StudioPanels, { type SceneId } from "./studio/StudioPanels"
import ProjectViewerOverlay from "./ProjectViewerOverlay"

export default function StreamPlayer() {
  const { setBroadcasterStreamId, addMessage, registerWs, activeForum, setActiveForum, setIsCreatingForum, exclusiveUser, setExclusiveUser, revokeExclusiveViewer } = useStreamRoom()
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamIdRef = useRef<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  
  // Exclusividad
  const exclusivePcRef = useRef<RTCPeerConnection | null>(null)
  const exclusiveAudioElRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const pendingExclusiveIceRef = useRef<RTCIceCandidateInit[]>([])

  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Puntero Láser
  const [pointerAllowed, setPointerAllowed] = useState(false)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
  
  const [starting, setStarting] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [micMuted, setMicMuted] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState<SceneId>("gameplay")
  const [streamDescription, setStreamDescription] = useState("")
  const [streamThumbnailUrl, setStreamThumbnailUrl] = useState("")
  const [savingMetadata, setSavingMetadata] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [forumResults, setForumResults] = useState<ForumResults | null>(null)
  const [forumResultsLoading, setForumResultsLoading] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)

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

      // --- Exclusividad ---
      if (msg.type === "exclusive-offer" && msg.sdp) {
        const fromId = msg.fromId as string
        const excPc = new RTCPeerConnection(rtcConfig)
        exclusivePcRef.current = excPc

        excPc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal({
              type: "exclusive-ice-candidate",
              streamId: streamIdRef.current,
              targetId: fromId,
              candidate: event.candidate,
            })
          }
        }

        excPc.ontrack = (event) => {
          const remoteStream = event.streams[0]
          if (!remoteStream) return

          // Reproducir para el transmisor localmente
          const audioEl = new Audio()
          audioEl.srcObject = remoteStream
          audioEl.play().catch(() => {})
          exclusiveAudioElRef.current = audioEl
          
          setExclusiveUser({ clientId: fromId, userName: "Invitado Exclusivo" })

          // Web Audio API Mezcla (Mic local + remoto -> todos los viewers)
          if (cameraStreamRef.current) {
            const ctx = new AudioContext()
            audioCtxRef.current = ctx
            const dest = ctx.createMediaStreamDestination()

            const localSource = ctx.createMediaStreamSource(cameraStreamRef.current)
            localSource.connect(dest)

            const remoteSource = ctx.createMediaStreamSource(remoteStream)
            remoteSource.connect(dest)

            const mixedTrack = dest.stream.getAudioTracks()[0]
            
            // Reemplazar la pista de audio a todos los espectadores de forma silenciosa
            peersRef.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === "audio")
              if (sender && mixedTrack) {
                sender.replaceTrack(mixedTrack).catch(() => {})
              }
            })
          }
        }

        await excPc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        while (pendingExclusiveIceRef.current.length > 0) {
          const c = pendingExclusiveIceRef.current.shift()
          if (c) await excPc.addIceCandidate(new RTCIceCandidate(c))
        }

        const answer = await excPc.createAnswer()
        await excPc.setLocalDescription(answer)
        sendSignal({
          type: "exclusive-answer",
          streamId: streamIdRef.current,
          targetId: fromId,
          sdp: answer,
        })
        return
      }

      if (msg.type === "exclusive-ice-candidate" && msg.candidate) {
        const excPc = exclusivePcRef.current
        if (excPc) {
          if (excPc.remoteDescription) {
            await excPc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {})
          } else {
            pendingExclusiveIceRef.current.push(msg.candidate)
          }
        }
        return
      }
      // --------------------

      if (msg.type === "pointer-move") {
        setPointerPos({ x: msg.x, y: msg.y })
        return
      }

      if (msg.type === "chat-message") {
        addMessage({
          text: msg.text,
          userName: msg.userName ?? "Anónimo",
          clientId: msg.clientId,
          timestamp: msg.timestamp ?? Date.now(),
        })
        return
      }

      if (msg.type === "viewer-joined") {
        await createPeerForViewer(msg.viewerId as string)
        return
      }

      if (msg.type === "viewer-count") {
        setViewerCount(msg.count ?? 0)
        return
      }

      if (msg.type === "answer") {
        const fromId = msg.fromId as string
        const pc = peersRef.current.get(fromId)
        if (!pc || !msg.sdp) return
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        
        const pending = pendingIceCandidatesRef.current.get(fromId) || []
        while (pending.length > 0) {
          const cand = pending.shift()
          if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand))
        }
        return
      }

      if (msg.type === "ice-candidate") {
        const fromId = msg.fromId as string
        const pc = peersRef.current.get(fromId)
        if (!pc || !msg.candidate) return
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
          } else {
            const arr = pendingIceCandidatesRef.current.get(fromId) || []
            arr.push(msg.candidate)
            pendingIceCandidatesRef.current.set(fromId, arr)
          }
        } catch {
          // ignore ice errors
        }
        return
      }
    },
    [createPeerForViewer, addMessage]
  )

  const connectSignaling = useCallback(() => {
    if (!streamIdRef.current || wsRef.current) return
    const ws = new WebSocket(WS_URL)
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
      registerWs(null)
      peersRef.current.forEach((pc) => pc.close())
      peersRef.current.clear()
      if (exclusivePcRef.current) {
        exclusivePcRef.current.close()
        exclusivePcRef.current = null
      }
      if (exclusiveAudioElRef.current) {
        exclusiveAudioElRef.current.pause()
        exclusiveAudioElRef.current = null
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
      setExclusiveUser(null)
    }
    wsRef.current = ws
    registerWs(ws)
  }, [handleSignalMessage, registerWs, setExclusiveUser])

  const startStream = useCallback(async () => {
    setError(null)
    setStarting(true)
    try {
      const { stream } = await createStreamApi()
      streamIdRef.current = stream.id
      setBroadcasterStreamId(stream.id)

      await startScreenCapture()
      connectSignaling()
      setIsStreaming(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo iniciar la transmisión"
      setError(message)
    } finally {
      setStarting(false)
    }
  }, [startScreenCapture, setBroadcasterStreamId, connectSignaling])

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
    setBroadcasterStreamId(null)
    setActiveForum(null)
    registerWs(null)
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    peersRef.current.forEach((pc) => pc.close())
    peersRef.current.clear()
    
    if (exclusivePcRef.current) {
      exclusivePcRef.current.close()
      exclusivePcRef.current = null
    }
    if (exclusiveAudioElRef.current) {
      exclusiveAudioElRef.current.pause()
      exclusiveAudioElRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setExclusiveUser(null)
    setPointerAllowed(false)
    setPointerPos(null)

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
  }, [isRecording, setBroadcasterStreamId, registerWs, setActiveForum])

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

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      alert("Solo se soportan imágenes (jpg, png, etc.) para la miniatura.")
      e.target.value = ""
      return
    }
    setUploadingThumb(true)
    try {
      const { fileUrl } = await uploadFileApi(file)
      setStreamThumbnailUrl(fileUrl)
      
      const sid = streamIdRef.current
      if (sid) {
        await updateStreamMetadataApi(sid, {
          description: streamDescription || undefined,
          thumbnailUrl: fileUrl,
        })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir la miniatura")
    } finally {
      setUploadingThumb(false)
      e.target.value = ""
    }
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Área de video (Preview / Canvas) */}
      <div className="flex-1 min-h-[400px] flex items-center justify-center bg-surface-muted rounded-lg overflow-hidden relative">
        <ProjectViewerOverlay />
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
            
            {/* Renderizado del Cursor Láser del Usuario Exclusivo */}
            {pointerPos && exclusiveUser && pointerAllowed && (
              <div
                className="absolute z-40 pointer-events-none flex flex-col items-center"
                style={{
                  left: `${pointerPos.x * 100}%`,
                  top: `${pointerPos.y * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse" />
                <span className="mt-1 text-[10px] font-bold text-white bg-red-600/90 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  {exclusiveUser.userName}
                </span>
              </div>
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
            
            {/* Panel de Usuario Exclusivo */}
            {exclusiveUser && (
              <div className="flex items-center gap-3 px-3 py-1.5 bg-brand/10 border border-brand/30 rounded-lg ml-2">
                <span className="text-sm font-semibold text-brand animate-pulse">
                  🎙 {exclusiveUser.userName}
                </span>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-copy-muted hover:text-copy border-l border-brand/20 pl-3">
                  <input
                    type="checkbox"
                    checked={pointerAllowed}
                    onChange={(e) => {
                      const allowed = e.target.checked
                      setPointerAllowed(allowed)
                      if (!allowed) setPointerPos(null)
                      if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                          type: "pointer-permission",
                          streamId: streamIdRef.current,
                          targetId: exclusiveUser.clientId,
                          allowed
                        }))
                      }
                    }}
                    className="accent-brand"
                  />
                  Puntero Láser
                </label>

                <button
                  type="button"
                  onClick={() => {
                    revokeExclusiveViewer()
                    if (exclusivePcRef.current) exclusivePcRef.current.close()
                    if (exclusiveAudioElRef.current) exclusiveAudioElRef.current.pause()
                    if (audioCtxRef.current) audioCtxRef.current.close()
                    setExclusiveUser(null)
                    setPointerAllowed(false)
                    setPointerPos(null)
                    
                    // Restaurar mic propio a los peers
                    peersRef.current.forEach(pc => {
                       const sender = pc.getSenders().find((s) => s.track && s.track.kind === "audio")
                       const ownMic = cameraStreamRef.current?.getAudioTracks()[0]
                       if (sender && ownMic) {
                         sender.replaceTrack(ownMic).catch(()=>{})
                       }
                    })
                  }}
                  className="px-2 py-1 bg-danger text-white text-xs rounded hover:bg-danger-hover transition-colors"
                >
                  Expulsar
                </button>
              </div>
            )}
            {isRecording && (
              <span className="text-sm text-copy-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                Grabando…
              </span>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-brand px-3 py-1.5 bg-brand/10 border border-brand/20 rounded-lg flex items-center gap-1.5" title="Espectadores en vivo">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                {viewerCount}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const sid = streamIdRef.current
                  if (!sid) return
                  setSavingMetadata(true)
                  try {
                    await updateStreamMetadataApi(sid, {
                      description: streamDescription || undefined,
                      thumbnailUrl: streamThumbnailUrl || null,
                    })
                    alert("¡Cambios guardados exitosamente!")
                  } catch (e) {
                    alert("Hubo un error al guardar los cambios.")
                  } finally {
                    setSavingMetadata(false)
                  }
                }}
                disabled={savingMetadata}
                className="px-3 py-1.5 rounded-lg bg-surface-muted text-copy text-xs font-medium hover:bg-surface border border-border disabled:opacity-50"
              >
                {savingMetadata ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingForum(true)}
                className="px-3 py-1.5 rounded-lg bg-surface-muted text-copy text-xs font-medium hover:bg-surface border border-border transition-colors"
              >
                Crear foro
              </button>
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

      {/* Descripción y miniatura (visible en transmisión) */}
      {isStreaming && (
        <div className="p-3 bg-surface-panel rounded-lg border border-border space-y-2">
          <p className="text-xs font-medium text-copy-muted">Descripción y miniatura (se muestran en la lista de transmisiones)</p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Descripción de la transmisión"
              value={streamDescription}
              onChange={(e) => setStreamDescription(e.target.value)}
              className="flex-1 min-w-[200px] bg-surface-muted text-copy text-sm p-2 h-[42px] rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="relative flex items-center bg-surface-muted rounded-lg border border-border px-3 gap-2 flex-1 min-w-[200px] h-[42px]">
              <span className="text-sm text-copy-muted line-clamp-1 flex-1">
                {streamThumbnailUrl ? "Miniatura cargada" : "Sin miniatura"}
              </span>
              <label className={`cursor-pointer text-xs font-medium px-2 py-1.5 rounded bg-brand text-white hover:bg-brand-hover transition-colors ${uploadingThumb ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingThumb ? "Subiendo..." : "Subir imagen"}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleThumbnailUpload} 
                />
              </label>
              {streamThumbnailUrl && (
                <button 
                  onClick={async () => {
                    setStreamThumbnailUrl("")
                    const sid = streamIdRef.current
                    if (sid) {
                      try {
                        await updateStreamMetadataApi(sid, {
                          description: streamDescription || undefined,
                          thumbnailUrl: null,
                        })
                      } catch (e) {}
                    }
                  }}
                  className="text-copy-muted hover:text-danger ml-1 font-bold"
                  title="Eliminar miniatura"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}



      {activeForum && (
        <div className="p-3 bg-surface-panel rounded-lg border border-border space-y-2">
          <p className="text-xs font-medium text-copy-muted">
            Foro activo: {activeForum.title} (visible 30 min para espectadores)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                setForumResultsLoading(true)
                try {
                  const data = await getForumResultsApi(activeForum.id)
                  setForumResults(data)
                } finally {
                  setForumResultsLoading(false)
                }
              }}
              disabled={forumResultsLoading}
              className="px-3 py-1.5 rounded-lg bg-surface-muted text-copy text-xs font-medium hover:bg-surface border border-border disabled:opacity-50"
            >
              {forumResultsLoading ? "Cargando…" : "Ver resultados"}
            </button>
          </div>
        </div>
      )}

      {forumResults && (
        <div className="p-3 bg-surface-panel rounded-lg border border-border space-y-3">
          <p className="font-medium text-copy">Resultados del foro: {forumResults.forum.title}</p>
          {forumResults.results ? (
            <ul className="space-y-1 text-sm">
              {forumResults.results.map((r) => (
                <li key={r.optionId} className="flex justify-between text-copy">
                  <span>{r.text}</span>
                  <span className="text-copy-muted">{r.count} votos</span>
                </li>
              ))}
            </ul>
          ) : forumResults.posts && forumResults.posts.length > 0 ? (
            <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
              {forumResults.posts.map((p) => (
                <li key={p.id} className="bg-surface-muted p-2 rounded">
                  <span className="font-medium text-copy-muted">{p.userName}:</span>{" "}
                  <span className="text-copy">{p.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-copy-muted">Sin participación aún.</p>
          )}
          <button
            type="button"
            onClick={() => setForumResults(null)}
            className="text-xs text-copy-muted hover:text-copy"
          >
            Cerrar resultados
          </button>
        </div>
      )}

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
