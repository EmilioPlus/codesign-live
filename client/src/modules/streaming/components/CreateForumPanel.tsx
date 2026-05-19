import { useState } from "react"
import { useStreamRoom } from "../../../context/StreamRoomContext"
import { createForumApi } from "../../../services/api"

export type ForumType = "poll" | "discussion"

const MAX_OPTIONS = 6
const DURATION_MINUTES = 30

export default function CreateForumPanel() {
  const { streamId, isCreatingForum, setIsCreatingForum, sendForumCreated, setActiveForum } = useStreamRoom()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<ForumType>("poll")
  const [options, setOptions] = useState(["", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isCreatingForum) return null

  const addOption = () => {
    if (options.length < MAX_OPTIONS) setOptions((prev) => [...prev, ""])
  }

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const setOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((v, i) => (i === index ? value : v)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!streamId) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const finalOptions = type === "poll" ? options.map((o) => o.trim()).filter(Boolean) : []
    if (type === "poll" && finalOptions.length < 2) return

    setLoading(true)
    setError(null)
    try {
      const { forum } = await createForumApi(streamId, {
        title: trimmedTitle,
        description: description.trim(),
        type,
        options: finalOptions,
      })
      setActiveForum(forum)
      sendForumCreated(forum)
      setIsCreatingForum(false)
      setTitle("")
      setDescription("")
      setOptions(["", ""])
      setType("poll")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el foro")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-b border-border bg-surface-panel flex flex-col max-h-[50vh] overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface-panel z-10">
        <h3 className="font-semibold text-copy text-sm">Crear foro en vivo</h3>
        <button
          type="button"
          onClick={() => setIsCreatingForum(false)}
          className="p-1 rounded text-copy-muted hover:text-copy hover:bg-surface-muted"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <p className="text-xs text-copy-muted">
          El foro estará visible por {DURATION_MINUTES} min.
        </p>

        {error && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded px-2 py-1">
            {error}
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-copy mb-1">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pregunta o tema..."
            className="w-full bg-surface-muted text-copy text-sm p-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-copy mb-1">Descripción (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto..."
            rows={2}
            className="w-full bg-surface-muted text-copy text-sm p-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-copy mb-2">Tipo</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="forumType"
                checked={type === "poll"}
                onChange={() => setType("poll")}
                className="rounded-full"
              />
              <span className="text-xs text-copy">Encuesta (opciones)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="forumType"
                checked={type === "discussion"}
                onChange={() => setType("discussion")}
                className="rounded-full"
              />
              <span className="text-xs text-copy">Debate abierto</span>
            </label>
          </div>
        </div>

        {type === "poll" && (
          <div>
            <label className="block text-xs font-medium text-copy mb-1">Opciones</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Opción ${i + 1}`}
                    className="flex-1 bg-surface-muted text-copy text-sm p-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="px-2 rounded text-copy-muted hover:bg-surface-muted disabled:opacity-50"
                  >
                    −
                  </button>
                </div>
              ))}
              {options.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={addOption}
                  className="text-xs text-brand hover:underline"
                >
                  + Añadir opción
                </button>
              )}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !title.trim() || (type === "poll" && options.filter(Boolean).length < 2)}
            className="w-full px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creando…" : "Crear foro"}
          </button>
        </div>
      </form>
    </div>
  )
}
