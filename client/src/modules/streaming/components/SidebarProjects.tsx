import { Link } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"

export default function SidebarProjects() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col h-full bg-surface-panel">

      {/* Header: vuelve a transmisiones en vivo sin cerrar sesión */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="text-lg font-semibold text-brand block">
          CoDesign LIVE
        </Link>
      </div>

      {/* Lista proyectos */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="p-3 rounded-lg bg-surface-muted hover:bg-surface-panel cursor-pointer transition text-copy">
          Proyecto Demo 1
        </div>
        <div className="p-3 rounded-lg bg-surface-muted hover:bg-surface-panel cursor-pointer transition text-copy">
          Proyecto Demo 2
        </div>
      </div>

      {/* Footer: solo nombre de usuario (sin botón cerrar sesión) */}
      <div className="p-4 border-t border-border">
        <div className="text-sm text-copy-muted">
          {user?.name ?? "Usuario Activo"}
        </div>
      </div>

    </div>
  )
}
