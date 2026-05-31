import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { getStreamsApi, STREAM_SECTIONS, type Stream } from "../../services/api"

const DEFAULT_THUMB =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9' fill='%23374151'%3E%3Crect width='16' height='9' rx='1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='2' font-family='system-ui'%3EPreview%3C/text%3E%3C/svg%3E"

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState<string>("Todas")

  const fetchStreams = useCallback((section?: string) => {
    setLoading(true)
    getStreamsApi(section)
      .then(({ streams }) => setStreams(streams))
      .catch(() => setStreams([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const section = selectedSection === "Todas" ? undefined : selectedSection
    fetchStreams(section)
    const interval = setInterval(() => fetchStreams(section), 4000)

    return () => clearInterval(interval)
  }, [fetchStreams, selectedSection])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <section className="mb-8">
        <h1 className="text-2xl font-semibold text-copy mb-1">
          Transmisiones en vivo
        </h1>
        <p className="text-copy-muted text-sm">
          Descubre a profesionales de render compartiendo su trabajo en tiempo real
        </p>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedSection("Todas")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            selectedSection === "Todas" ? "bg-brand text-white" : "bg-surface-muted text-copy hover:bg-surface"
          }`}
        >
          Todas
        </button>
        {STREAM_SECTIONS.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setSelectedSection(section)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              selectedSection === section ? "bg-brand text-white" : "bg-surface-muted text-copy hover:bg-surface"
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      <div className="mb-4 text-sm text-copy-muted">
        También puedes explorar transmisiones por sección:
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {STREAM_SECTIONS.map((section) => (
          <Link
            key={section}
            to={`/seccion/${encodeURIComponent(section)}`}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-muted text-copy hover:bg-surface transition-colors"
          >
            {section}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-copy-muted col-span-full">Cargando transmisiones…</p>
        ) : streams.length === 0 ? (
          <p className="text-copy-muted col-span-full">
            No hay transmisiones en vivo. Sé el primero en transmitir.
          </p>
        ) : (
          streams.map((s) => (
            <Link
              key={s.id}
              to={isAuthenticated ? `/stream/${s.id}` : "/login"}
              className="group block bg-surface-panel border border-border rounded-lg overflow-hidden hover:border-brand/50 transition-colors"
            >
              <div className="aspect-video bg-surface-muted relative overflow-hidden">
                <img
                  src={s.thumbnailUrl || DEFAULT_THUMB}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-danger text-white text-xs font-medium">
                  EN VIVO
                </span>
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface/90 text-copy-muted text-xs">
                  {s.viewers} espectadores
                </span>
              </div>
              <div className="p-3 flex gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-surface-muted border border-border">
                  {s.userAvatarUrl ? (
                    <img src={s.userAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-copy-muted text-sm font-medium">
                      {(s.user || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-copy truncate">{s.title}</p>
                  {s.categories?.length ? (
                    <span className="inline-flex items-center rounded-full bg-surface-muted text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-1 mt-1 text-copy-muted">
                      {s.categories[0]}
                    </span>
                  ) : null}
                  {s.description ? (
                    <>
                      <p className="text-sm text-copy-muted line-clamp-2 mt-1">{s.description}</p>
                      <p className="text-xs text-copy-muted/80 mt-0.5">{s.user}</p>
                    </>
                  ) : (
                    <p className="text-sm text-copy-muted mt-1">{s.user}</p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

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
