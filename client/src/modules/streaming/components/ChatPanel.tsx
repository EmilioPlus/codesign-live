import { useRef, useEffect, useState, useCallback } from "react"
import { useStreamRoomOptional } from "../../../context/StreamRoomContext"
import { useAuth } from "../../../context/AuthContext"
import { uploadChatFileApi } from "../../../services/api"

const REACTION_PREFIX = "__reaction__"

// Emojis con etiqueta y valor en puntos
const EMOJIS: { emoji: string; label: string; value: number }[] = [
  { emoji: "👏", label: "Aplausos",    value: 1 },
  { emoji: "💡", label: "Buena idea", value: 2 },
  { emoji: "❤️", label: "Me encanta", value: 3 },
  { emoji: "🤔", label: "Interesante",value: 1 },
  { emoji: "😮", label: "Sorpresa",   value: 2 },
  { emoji: "🔥", label: "¡Fuego!",    value: 3 },
  { emoji: "✨", label: "Brillante",  value: 2 },
]

// Tipos de archivo permitidos para compartir en chat (solo usuarios exclusivos)
const CHAT_FILE_TYPES = ".pdf,.xlsx,.xls,.txt"
const CHAT_FILE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-excel": "Excel",
  "text/plain": "TXT",
}

// Tiempo de espera entre reacciones (segundos)
const REACTION_COOLDOWN_S = 10

export default function ChatPanel() {
  const room = useStreamRoomOptional()
  const { user } = useAuth()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Cooldown de reacciones
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [room?.messages ?? []])

  // Limpiar el intervalo al desmontar
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)
    }
  }, [])

  if (!room) {
    return (
      <div className="flex-1 min-h-0 h-full flex flex-col bg-surface-panel p-2 sm:p-4">
        <h3 className="font-semibold text-copy">Chat en Tiempo Real</h3>
        <p className="text-copy-muted text-sm mt-2">Cargando...</p>
      </div>
    )
  }

  const { streamId, messages, sendMessage, exclusiveUser, sendFileMessage } = room
  const userName = user?.name ?? "Anónimo"

  // Determinar si el usuario actual ES el usuario exclusivo
  const isCurrentUserExclusive = !!(exclusiveUser && user && exclusiveUser.userName === user.name)
  // Determinar si estamos en la vista del transmisor
  const isBroadcasterView = window.location.pathname === "/stream"
  // El transmisor y el usuario exclusivo pueden compartir archivos
  const canShareFiles = isCurrentUserExclusive || isBroadcasterView

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    sendMessage(text, userName)
    setInput("")
  }

  // ── Subir archivo en chat ─────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !streamId) return
    setUploadingFile(true)
    try {
      const { fileUrl } = await uploadChatFileApi(file)
      if (sendFileMessage) {
        sendFileMessage({
          fileUrl,
          fileName: file.name,
          fileType: file.type,
          userName,
        })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir el archivo")
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ── Conteos y puntuación ────────────────────────────────────────────────────
  const reactionCounts = useCallback(() => {
    const counts: Record<string, number> = {}
    for (const msg of messages) {
      if (msg.text.startsWith(REACTION_PREFIX)) {
        const emoji = msg.text.slice(REACTION_PREFIX.length)
        counts[emoji] = (counts[emoji] || 0) + 1
      }
    }
    return counts
  }, [messages])

  const totalScore = useCallback(() => {
    const counts = reactionCounts()
    return EMOJIS.reduce((sum, { emoji, value }) => sum + (counts[emoji] || 0) * value, 0)
  }, [reactionCounts])

  // ── Enviar reacción con cooldown ─────────────────────────────────────────────
  const startCooldown = () => {
    let remaining = REACTION_COOLDOWN_S
    setCooldownLeft(remaining)
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)
    cooldownIntervalRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        setCooldownLeft(0)
        if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)
      } else {
        setCooldownLeft(remaining)
      }
    }, 1000)
  }

  const sendReaction = (emoji: string) => {
    if (!streamId || cooldownLeft > 0) return
    sendMessage(`${REACTION_PREFIX}${emoji}`, userName)
    startCooldown()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-surface-panel">
      {/* Header del chat */}
      <div className="p-2 sm:p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-copy">Chat en Tiempo Real</h3>
        {streamId && totalScore() > 0 && (
          <div
            title="Puntuación acumulada del transmisor según reacciones"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
          >
            <span className="text-sm">⭐</span>
            <span className="text-xs font-bold tabular-nums">{totalScore().toLocaleString()} pts</span>
          </div>
        )}
      </div>

      {!streamId ? (
        <div className="flex-1 p-2 sm:p-4 flex items-center justify-center">
          <p className="text-copy-muted text-sm text-center">
            Inicia una transmisión o únete a una para ver y escribir en el chat.
          </p>
        </div>
      ) : (
        <>
          {/* Lista de mensajes */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 min-h-0">
            {messages.length === 0 && (
              <p className="text-copy-muted text-sm">Sin mensajes aún. ¡Sé el primero en saludar!</p>
            )}
            {messages.map((msg) => {
              const isExclusive = room.exclusiveUser?.clientId === msg.clientId
              const isMyMessage = msg.userName === user?.name
              const isReaction = msg.text.startsWith(REACTION_PREFIX)
              const reactionEmoji = isReaction ? msg.text.slice(REACTION_PREFIX.length) : null
              const emojiDef = isReaction ? EMOJIS.find(e => e.emoji === reactionEmoji) : null
              const isFileMsg = (msg as any).fileUrl != null

              if (isReaction) {
                return (
                  <div key={msg.id} className="flex items-center gap-2 py-0.5">
                    <span className="text-base leading-none">{reactionEmoji}</span>
                    <span className="text-xs text-copy-muted italic">
                      {msg.userName} reaccionó
                      {emojiDef && (
                        <span className="ml-1 text-yellow-400 font-semibold">+{emojiDef.value} pt{emojiDef.value > 1 ? "s" : ""}</span>
                      )}
                    </span>
                  </div>
                )
              }

              if (isFileMsg) {
                const fileMsg = msg as any
                const ext = fileMsg.fileName?.split(".").pop()?.toUpperCase() || "FILE"
                const label = CHAT_FILE_LABELS[fileMsg.fileType] || ext
                return (
                  <div
                    key={msg.id}
                    className={`p-2 sm:p-3 rounded-lg ${isExclusive ? "bg-brand/10 border border-brand/30" : "bg-surface-muted"}`}
                  >
                    <p className={`text-xs font-medium mb-1.5 ${isExclusive && isBroadcasterView ? "text-brand animate-pulse" : "text-copy-muted"}`}>
                      {msg.userName} {isExclusive && isBroadcasterView && "(Invitado Exclusivo)"} compartió un archivo
                    </p>
                    <a
                      href={fileMsg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border hover:border-brand/50 transition-colors group"
                    >
                      <span className="w-9 h-9 flex items-center justify-center rounded bg-brand/20 text-brand text-xs font-bold shrink-0">
                        {label}
                      </span>
                      <span className="text-sm text-copy group-hover:text-brand transition-colors truncate flex-1">
                        {fileMsg.fileName}
                      </span>
                      <svg className="ml-auto shrink-0 text-copy-muted group-hover:text-brand w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </a>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  className={`p-2 sm:p-3 rounded-lg relative group ${isExclusive ? "bg-brand/10 border border-brand/30" : "bg-surface-muted"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-xs font-medium ${isExclusive && isBroadcasterView ? "text-brand animate-pulse" : "text-copy-muted"}`}>
                      {msg.userName} {isExclusive && isBroadcasterView && "(Invitado Exclusivo)"}
                    </p>

                    {isBroadcasterView && !isExclusive && !isMyMessage && msg.clientId && (
                      <button
                        onClick={() => room.inviteExclusiveViewer(msg.clientId, msg.userName, user?.name)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] bg-brand text-white px-2 py-0.5 rounded transition-opacity"
                        title="Invitar a audio exclusivo"
                      >
                        Hacer Exclusivo
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-copy break-words">{msg.text}</p>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra de reacciones con sistema de puntos */}
          <div className="border-t border-border">
            {(() => {
              const counts = reactionCounts()
              const active = EMOJIS.filter(e => counts[e.emoji] > 0)
              return active.length > 0 ? (
                <div className="px-2 sm:px-4 pt-2 pb-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-copy-muted font-medium uppercase tracking-wide mr-1">Reacciones:</span>
                  {active.map(({ emoji, label, value }) => (
                    <div
                      key={emoji}
                      title={`${label} · ${value} pt${value > 1 ? "s" : ""} c/u`}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-muted border border-border text-xs font-medium"
                    >
                      <span>{emoji}</span>
                      <span className="text-copy font-semibold tabular-nums">{counts[emoji]}</span>
                    </div>
                  ))}
                </div>
              ) : null
            })()}

            <div className="px-2 sm:px-3 pt-1 pb-2">
              {cooldownLeft > 0 && (
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-brand transition-all duration-1000"
                      style={{ width: `${(cooldownLeft / REACTION_COOLDOWN_S) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-copy-muted tabular-nums shrink-0">
                    Espera {cooldownLeft}s
                  </span>
                </div>
              )}

              <div className="flex items-center gap-0.5 flex-wrap">
                {EMOJIS.map(({ emoji, label, value }) => (
                  <button
                    key={emoji}
                    type="button"
                    title={`${label} · +${value} pt${value > 1 ? "s" : ""}`}
                    onClick={() => sendReaction(emoji)}
                    disabled={cooldownLeft > 0}
                    className={`group relative text-lg sm:text-xl p-1 sm:p-1.5 rounded-lg transition-all
                      ${cooldownLeft > 0
                        ? "opacity-40 cursor-not-allowed grayscale"
                        : "hover:scale-125 active:scale-95 hover:bg-surface-muted cursor-pointer"
                      }`}
                  >
                    {emoji}
                    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-surface-panel border border-border rounded px-1.5 py-0.5 text-copy-muted opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center gap-0.5">
                      <span>{label}</span>
                      <span className="text-yellow-400 font-bold">+{value} pt{value > 1 ? "s" : ""}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Botón de archivo — solo para usuario exclusivo o transmisor */}
          {canShareFiles && (
            <div className="px-2 pb-1 sm:px-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={CHAT_FILE_TYPES}
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                disabled={uploadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-1.5 px-3 rounded-lg bg-brand/10 border border-brand/30 text-brand text-xs font-medium hover:bg-brand/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                title="Compartir archivo PDF, Excel o TXT con la audiencia"
              >
                {uploadingFile ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-brand/40 border-t-brand animate-spin" />
                    Subiendo archivo...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    Compartir archivo (PDF, Excel, TXT)
                  </>
                )}
              </button>
              <p className="text-[10px] text-copy-muted text-center mt-1">Solo usuarios exclusivos pueden compartir archivos</p>
            </div>
          )}

          {/* Input del chat */}
          <div className="px-2 pb-2 sm:px-4 sm:pb-4 pt-2 bg-surface-panel">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                className="flex-1 bg-surface-muted text-copy p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-copy-muted"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-4 py-2 rounded-lg bg-brand text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                Enviar
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
