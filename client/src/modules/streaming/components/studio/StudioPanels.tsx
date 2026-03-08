import type { FC } from "react"

export const SCENES = [
  { id: "starting", name: "Starting Soon" },
  { id: "gameplay", name: "Gameplay" },
  { id: "chatting", name: "Just Chatting" },
] as const

export type SceneId = (typeof SCENES)[number]["id"]

type Props = {
  activeSceneId: SceneId
  onSceneChange: (id: SceneId) => void
  isStreaming: boolean
  cameraOn: boolean
  micMuted: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
}

const StudioPanels: FC<Props> = ({
  activeSceneId,
  onSceneChange,
  isStreaming,
  cameraOn,
  micMuted,
  onToggleCamera,
  onToggleMic,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
      {/* Escenas */}
      <div className="bg-surface-panel border border-border rounded-lg p-3 space-y-2">
        <p className="font-medium text-copy text-xs mb-1">Escenas</p>
        <div className="space-y-1.5">
          {SCENES.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSceneChange(scene.id)}
              className={`w-full text-left px-2 py-1.5 rounded border text-xs transition-colors ${
                activeSceneId === scene.id
                  ? "bg-brand text-white border-brand"
                  : "bg-surface-muted text-copy border-border hover:bg-surface"
              }`}
            >
              {scene.name}
            </button>
          ))}
        </div>
      </div>

      {/* Fuentes */}
      <div className="bg-surface-panel border border-border rounded-lg p-3 space-y-2">
        <p className="font-medium text-copy text-xs mb-1">Fuentes</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-copy-muted">Captura de pantalla</span>
            <span className="text-copy text-[11px]">
              {isStreaming ? "Activa" : "Inactiva"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-copy-muted">Cámara</span>
            <button
              type="button"
              onClick={onToggleCamera}
              className="px-2 py-1 rounded bg-surface-muted text-copy text-[11px] hover:bg-surface border border-border transition-colors"
            >
              {cameraOn ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>
      </div>

      {/* Audio / Mixer */}
      <div className="bg-surface-panel border border-border rounded-lg p-3 space-y-2">
        <p className="font-medium text-copy text-xs mb-1">Audio Mixer</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-copy-muted">Micrófono</span>
            <button
              type="button"
              onClick={onToggleMic}
              disabled={!cameraOn}
              className="px-2 py-1 rounded bg-surface-muted text-copy text-[11px] hover:bg-surface border border-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {micMuted ? "Activar" : "Silenciar"}
            </button>
          </div>
          <p className="text-[11px] text-copy-muted">
            Consejo: mantén la voz en un nivel cómodo y evita saturar.
          </p>
        </div>
      </div>
    </div>
  )
}

export default StudioPanels

