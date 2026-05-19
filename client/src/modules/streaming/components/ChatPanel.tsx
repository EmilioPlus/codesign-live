import { useRef, useEffect, useState, useCallback } from "react"
import { useStreamRoomOptional } from "../../../context/StreamRoomContext"
import { useAuth } from "../../../context/AuthContext"

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

// Tiempo de espera entre reacciones (segundos)
const REACTION_COOLDOWN_S = 10

export default function ChatPanel() {
  const room = useStreamRoomOptional()
  const { user } = useAuth()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const { streamId, messages, sendMessage } = room
  const userName = user?.name ?? "Anónimo"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    sendMessage(text, userName)
    setInput("")
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
    // Solo en historial del chat — sin floaters en pantalla
    sendMessage(`${REACTION_PREFIX}${emoji}`, userName)
    startCooldown()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-surface-panel">
      {/* Header del chat */}
      <div className="p-2 sm:p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-copy">Chat en Tiempo Real</h3>
        {/* Puntuación acumulada del streamer */}
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
              const isBroadcasterView = window.location.pathname === "/stream"
              const isExclusive = room.exclusiveUser?.clientId === msg.clientId
              const isMyMessage = msg.userName === user?.name
              const isReaction = msg.text.startsWith(REACTION_PREFIX)
              const reactionEmoji = isReaction ? msg.text.slice(REACTION_PREFIX.length) : null
              const emojiDef = isReaction ? EMOJIS.find(e => e.emoji === reactionEmoji) : null

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
                        onClick={() => room.inviteExclusiveViewer(msg.clientId, msg.userName)}
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

            {/* Contadores por emoji */}
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

            {/* Botones de envío + cooldown */}
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
                    {/* Tooltip con valor */}
                    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-surface-panel border border-border rounded px-1.5 py-0.5 text-copy-muted opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center gap-0.5">
                      <span>{label}</span>
                      <span className="text-yellow-400 font-bold">+{value} pt{value > 1 ? "s" : ""}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

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
