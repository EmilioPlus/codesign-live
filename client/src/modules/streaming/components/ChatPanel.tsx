export default function ChatPanel() {
  return (
    <div className="h-full flex flex-col bg-surface-panel">

      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-copy">
          Chat en Tiempo Real
        </h3>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-surface-muted p-3 rounded-lg">
          <p className="text-sm text-copy">
            Mensaje de ejemplo
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-surface-panel">
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          className="w-full bg-surface-muted text-copy p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

    </div>
  )
}