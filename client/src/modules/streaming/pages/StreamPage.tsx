import { Link } from "react-router-dom"
import StreamPlayer from "../components/StreamPlayer"

// Detect if the browser supports screen sharing (desktop only)
const canBroadcast =
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  "getDisplayMedia" in navigator.mediaDevices

export default function StreamPage() {
  if (!canBroadcast) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center">
          <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-warning">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-copy mb-2">Transmisión no disponible en móvil</h2>
          <p className="text-copy-muted text-sm max-w-xs mx-auto">
            La captura de pantalla para transmitir en vivo solo está disponible en navegadores de escritorio como Chrome, Edge o Firefox.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-xs text-copy-muted">Puedes ver transmisiones en vivo desde tu móvil como espectador.</p>
          <Link
            to="/"
            className="w-full px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors text-center"
          >
            Ver transmisiones en vivo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-6 min-h-0">

      {/* Título */}
      <div>
        <h2 className="text-2xl font-semibold text-copy">
          Sala de Colaboración
        </h2>
        <p className="text-copy-muted text-sm">
          Streaming y visualización 3D en tiempo real
        </p>
      </div>

      {/* Área principal */}
      <div className="flex-1 bg-surface-panel rounded-lg border border-border flex items-center justify-center">
        <StreamPlayer />
      </div>

    </div>
  )
}