import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { getStreamsApi, type Stream } from "../../services/api"

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStreams = () => {
      getStreamsApi()
        .then(({ streams }) => setStreams(streams))
        .catch(() => setStreams([]))
        .finally(() => setLoading(false))
    }

    fetchStreams()
    const interval = setInterval(fetchStreams, 4000)

    return () => clearInterval(interval)
  }, [])

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
              <div className="aspect-video bg-surface-muted relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-copy-muted text-sm">Preview</span>
                </div>
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-danger text-white text-xs font-medium">
                  EN VIVO
                </span>
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface/90 text-copy-muted text-xs">
                  {s.viewers} espectadores
                </span>
              </div>
              <div className="p-3">
                <p className="font-medium text-copy truncate">{s.title}</p>
                <p className="text-sm text-copy-muted">{s.user}</p>
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
