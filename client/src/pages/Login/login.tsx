import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { ForgotPasswordModal } from "../../components/ForgotPasswordModal"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate("/")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-surface-panel border border-border rounded-lg p-6">
        <h1 className="text-xl font-semibold text-copy mb-1">Iniciar sesión</h1>
        <p className="text-sm text-copy-muted mb-6">
          Ingresa a tu cuenta de CoDesign LIVE
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-copy-muted mb-1">
              Correo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-copy-muted mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="mt-1 text-xs text-brand hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <p className="mt-4 text-sm text-copy-muted text-center">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-brand hover:underline">
            Regístrate
          </Link>
        </p>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  )
}
