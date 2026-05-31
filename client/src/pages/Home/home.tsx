import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { getStreamsApi, STREAM_SECTIONS, type Stream, WS_URL } from "../../services/api"

const DEFAULT_THUMB =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9' fill='%23374151'%3E%3Crect width='16' height='9' rx='1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='2' font-family='system-ui'%3EPreview%3C/text%3E%3C/svg%3E"

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)

  const fetchStreams = useCallback(() => {
    setLoading(true)
    getStreamsApi()
      .then(({ streams }) => setStreams(streams))
      .catch(() => setStreams([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStreams()

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe-stream-updates" }))
    }

    ws.onmessage = (event) => {
      let payload
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }

      if (payload.type === "stream-started" && payload.stream) {
        setStreams((current) => {
          if (current.some((stream) => stream.id === payload.stream.id)) return current
          return [payload.stream, ...current]
        })
      }

      if (payload.type === "stream-ended" && payload.streamId) {
        setStreams((current) => current.filter((stream) => stream.id !== payload.streamId))
      }

      if (payload.type === "stream-updated" && payload.stream) {
        setStreams((current) =>
          current.map((stream) => (stream.id === payload.stream.id ? payload.stream : stream))
        )
      }
    }

    ws.onerror = () => {
      // ignore socket failures here; streams still load once on page open
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [fetchStreams])

  const sectionGroups = useMemo(() => {
    const grouped = streams.reduce<Record<string, Stream[]>>((acc, stream) => {
      const category = stream.categories?.[0] || "Sin sección"
      if (!acc[category]) acc[category] = []
      acc[category].push(stream)
      return acc
    }, {})

    const orderedKeys = [
      ...STREAM_SECTIONS.filter((section) => grouped[section]),
      ...Object.keys(grouped).filter((key) => !STREAM_SECTIONS.some((section) => section === key)),
    ]

    return { grouped, orderedKeys }
  }, [streams])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <section className="mb-8">
        <h1 className="text-2xl font-semibold text-copy mb-1">
          Transmisiones en vivo
        </h1>
      </section>

      <div className="mb-8" />

      {loading ? (
        <p className="text-copy-muted">Cargando transmisiones…</p>
      ) : streams.length === 0 ? (
        <p className="text-copy-muted">
          No hay transmisiones en vivo. Sé el primero en transmitir.
        </p>
      ) : (
        <div className="space-y-10">
          {sectionGroups.orderedKeys.map((sectionKey) => (
            <section key={sectionKey} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-copy">{sectionKey}</h2>
                <span className="text-sm text-copy-muted">
                  {sectionGroups.grouped[sectionKey].length} transmisión{sectionGroups.grouped[sectionKey].length > 1 ? "es" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sectionGroups.grouped[sectionKey].map((stream) => (
                  <Link
                    key={stream.id}
                    to={isAuthenticated ? `/stream/${stream.id}` : "/login"}
                    className="group block bg-surface-panel border border-border rounded-lg overflow-hidden hover:border-brand/50 transition-colors"
                  >
                    <div className="aspect-video bg-surface-muted relative overflow-hidden">
                      <img
                        src={stream.thumbnailUrl || DEFAULT_THUMB}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-danger text-white text-xs font-medium">
                        EN VIVO
                      </span>
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface/90 text-copy-muted text-xs">
                        {stream.viewers} espectadores
                      </span>
                    </div>
                    <div className="p-3 flex gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-surface-muted border border-border">
                        {stream.userAvatarUrl ? (
                          <img src={stream.userAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-copy-muted text-sm font-medium">
                            {(stream.user || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-copy truncate">{stream.title}</p>
                        {stream.categories?.length ? (
                          <span className="inline-flex items-center rounded-full bg-surface-muted text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-1 mt-1 text-copy-muted">
                            {stream.categories[0]}
                          </span>
                        ) : null}
                        {stream.description ? (
                          <>
                            <p className="text-sm text-copy-muted line-clamp-2 mt-1">{stream.description}</p>
                            <p className="text-xs text-copy-muted/80 mt-0.5">{stream.user}</p>
                          </>
                        ) : (
                          <p className="text-sm text-copy-muted mt-1">{stream.user}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <div className="mt-8 p-4 bg-surface-panel border border-border rounded-lg text-center">
          <p className="text-copy-muted text-sm mb-3">
            Inicia sesión o regístrate para ver las transmisiones y unirte al chat
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm font-medium hover:bg-surface border border-border transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
