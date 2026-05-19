import { useState } from "react"
import { Outlet, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-[100dvh] flex flex-col bg-surface">
      <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b border-border bg-surface-panel">
        {/* Logo */}
        <Link to="/" className="text-lg font-semibold text-brand shrink-0" onClick={closeMenu}>
          CoDesign LIVE
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="text-sm text-copy-muted hover:text-copy px-2 py-1.5 rounded-lg hover:bg-surface-muted transition-colors"
              >
                {user?.name}
              </Link>
              {user?.role === "super_admin" && (
                <Link
                  to="/admin"
                  className="px-3 py-1.5 rounded-lg bg-surface-muted text-brand text-sm font-medium border border-brand/40 hover:bg-brand/10 transition-colors"
                >
                  Panel Admin
                </Link>
              )}
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
        </nav>

        {/* Mobile: hamburger button */}
        <button
          type="button"
          className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg text-copy hover:bg-surface-muted transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Abrir menú"
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black/50" onClick={closeMenu}>
          <nav
            className="absolute top-14 right-0 left-0 bg-surface-panel border-b border-border p-4 flex flex-col gap-2 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="px-4 py-3 rounded-lg bg-surface-muted text-copy text-sm font-medium hover:bg-surface transition-colors flex items-center gap-2"
                >
                  👤 {user?.name}
                </Link>
                {user?.role === "super_admin" && (
                  <Link
                    to="/admin"
                    onClick={closeMenu}
                    className="px-4 py-3 rounded-lg bg-brand/10 text-brand text-sm font-medium border border-brand/30 hover:bg-brand/20 transition-colors"
                  >
                    🛡 Panel Admin
                  </Link>
                )}
                <Link
                  to="/stream"
                  onClick={closeMenu}
                  className="px-4 py-3 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors text-center"
                >
                  🎙 Transmitir
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); closeMenu() }}
                  className="px-4 py-3 rounded-lg bg-surface-muted text-copy text-sm hover:bg-surface border border-border transition-colors text-left"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="px-4 py-3 rounded-lg bg-surface-muted text-copy text-sm font-medium hover:bg-surface border border-border transition-colors text-center"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="px-4 py-3 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors text-center"
                >
                  Registrarse
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
