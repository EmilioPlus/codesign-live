import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { getStreamsApi, STREAM_SECTIONS, type Stream } from "../../services/api"

const DEFAULT_THUMB =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9' fill='%23374151'%3E%3Crect width='16' height='9' rx='1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='2' font-family='system-ui'%3EPreview%3C/text%3E%3C/svg%3E"

export default function SectionPage() {
  const { section } = useParams()
  const { isAuthenticated } = useAuth()
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)

  const sectionLabel = section ? decodeURIComponent(section) : ""
  const isAllSection = sectionLabel === "Todas"
  const normalizedSection = sectionLabel || "Todas"

  useEffect(() => {
    setLoading(true)
    const sectionFilter = isAllSection ? undefined : sectionLabel || undefined

    getStreamsApi(sectionFilter)
      .then(({ streams }) => setStreams(streams))
      .catch(() => setStreams([]))
      .finally(() => setLoading(false))
  }, [sectionLabel, isAllSection])

  const availableSections = ["Todas", ...STREAM_SECTIONS]

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-copy mb-1">Sección: {normalizedSection}</h1>
        <p className="text-copy-muted text-sm">
          Explora transmisiones en vivo clasificadas por sección. Escoge otra sección para ver transmisiones relacionadas.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {availableSections.map((label) => (
          <Link
            key={label}
            to={label === "Todas" ? "/" : `/seccion/${encodeURIComponent(label)}`}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              label === normalizedSection ? "bg-brand text-white" : "bg-surface-muted text-copy hover:bg-surface"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-copy-muted col-span-full">Cargando transmisiones…</p>
        ) : streams.length === 0 ? (
          <div className="col-span-full rounded-lg border border-border bg-surface-panel p-6 text-center">
            <p className="text-copy-muted">No hay transmisiones activas en esta sección.</p>
            <Link
              to="/"
              className="inline-flex mt-4 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
            >
              Ver todas las transmisiones
            </Link>
          </div>
        ) : (
          streams.map((stream) => (
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
          ))
        )}
      </div>
    </div>
  )
}
