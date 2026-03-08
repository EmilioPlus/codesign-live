import StreamPlayer from "../components/StreamPlayer"

export default function StreamPage() {
  return (
    <div className="h-full flex flex-col gap-6">

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