import { Outlet, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b border-border bg-surface-panel">
        <Link to="/" className="text-lg font-semibold text-brand">
          CoDesign LIVE
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="text-sm text-copy-muted hidden sm:inline hover:text-copy"
              >
                {user?.name}
              </Link>
              <Link
                to="/stream"
                className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
              >
                Transmitir
              </Link>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 rounded-lg bg-surface-muted text-copy text-sm hover:bg-surface border border-border transition-colors"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg bg-surface-muted text-copy text-sm hover:bg-surface border border-border transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
