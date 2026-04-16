import { useState, useEffect } from "react"
import { useStreamRoomOptional } from "../../../context/StreamRoomContext"
import { voteForumApi, addForumPostApi } from "../../../services/api"

function useTimeLeft(expiresAt: string | null): number | null {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!expiresAt) {
      setLeft(null)
      return
    }
    const update = () => {
      const end = new Date(expiresAt).getTime()
      const now = Date.now()
      if (now >= end) {
        setLeft(0)
        return
      }
      setLeft(Math.round((end - now) / 1000))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [expiresAt])
  return left
}

function formatTimeLeft(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function ForumPanel() {
  const room = useStreamRoomOptional()
  const [voting, setVoting] = useState(false)
  const [postText, setPostText] = useState("")
  const [posting, setPosting] = useState(false)
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null)

  const { streamId, activeForum, setActiveForum, sendForumUpdate } = room || {}
  const timeLeft = useTimeLeft(activeForum?.expiresAt ?? null)

  useEffect(() => {
    if (timeLeft === 0 && activeForum) {
      setActiveForum?.(null)
    }
  }, [timeLeft, activeForum, setActiveForum])

  if (!room || !streamId) return null
  if (!activeForum) return null

  const expired = timeLeft !== null && timeLeft <= 0
  if (expired) return null

  const isPoll = activeForum.type === "poll"
  const isDiscussion = activeForum.type === "discussion"

  if (isPoll && votedOptionId !== null) return null;

  return (
    <div className="border-b border-border p-4 bg-surface-panel">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-copy text-sm">Foro en vivo</h3>
        {timeLeft !== null && timeLeft > 0 && (
          <span className="text-xs text-copy-muted">
            Cierra en {formatTimeLeft(timeLeft)}
          </span>
        )}
      </div>
      <p className="font-medium text-copy text-sm mb-1">{activeForum.title}</p>
      {activeForum.description && (
        <p className="text-xs text-copy-muted mb-3">{activeForum.description}</p>
      )}

      {isPoll && (
        <div className="space-y-2">
          {activeForum.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={voting || votedOptionId !== null}
              onClick={async () => {
                setVoting(true)
                try {
                  await voteForumApi(activeForum.id, opt.id)
                  setVotedOptionId(opt.id)
                  sendForumUpdate?.(activeForum.id)
                } finally {
                  setVoting(false)
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                votedOptionId === opt.id
                  ? "bg-brand/20 border-brand text-copy"
                  : "bg-surface-muted border-border text-copy hover:bg-surface"
              } disabled:opacity-70`}
            >
              {opt.text}
              {votedOptionId === opt.id && " ✓"}
            </button>
          ))}
        </div>
      )}

      {isDiscussion && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!postText.trim() || posting) return
            setPosting(true)
            try {
              await addForumPostApi(activeForum.id, postText.trim())
              setPostText("")
              sendForumUpdate?.(activeForum.id)
            } finally {
              setPosting(false)
            }
          }}
        >
          <input
            type="text"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Escribe tu comentario..."
            maxLength={1000}
            className="flex-1 bg-surface-muted text-copy text-sm p-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={!postText.trim() || posting}
            className="px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-50"
          >
            {posting ? "…" : "Enviar"}
          </button>
        </form>
      )}
    </div>
  )
}
