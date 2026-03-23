import { useRef, useEffect, useState } from "react"
import { useStreamRoomOptional } from "../../../context/StreamRoomContext"
import { useAuth } from "../../../context/AuthContext"

export default function ChatPanel() {
  const room = useStreamRoomOptional()
  const { user } = useAuth()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [room?.messages ?? []])

  if (!room) {
    return (
      <div className="h-full flex flex-col bg-surface-panel p-4">
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

  return (
    <div className="h-full flex flex-col bg-surface-panel">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-copy">Chat en Tiempo Real</h3>
      </div>

      {!streamId ? (
        <div className="flex-1 p-4 flex items-center justify-center">
          <p className="text-copy-muted text-sm text-center">
            Inicia una transmisión o únete a una para ver y escribir en el chat.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <p className="text-copy-muted text-sm">Sin mensajes aún. ¡Sé el primero en saludar!</p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-surface-muted p-3 rounded-lg"
              >
                <p className="text-xs text-copy-muted font-medium mb-1">{msg.userName}</p>
                <p className="text-sm text-copy break-words">{msg.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border bg-surface-panel">
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
