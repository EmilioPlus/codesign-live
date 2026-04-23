import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const [isSuccess, setIsSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await register(name, email, password)
      if (data.success) {
        setIsSuccess(true)
        setSuccessMessage(data.message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear la cuenta"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-surface-panel border border-border rounded-lg p-6">
        <h1 className="text-xl font-semibold text-copy mb-1">Crear cuenta</h1>
        <p className="text-sm text-copy-muted mb-6">
          Únete a CoDesign LIVE para ver y transmitir renders
        </p>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand/10 text-brand mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className="text-lg font-medium text-copy mb-2">¡Revisa tu correo!</h2>
            <p className="text-copy-muted text-sm px-4">
              {successMessage}
            </p>
            <Link to="/login" className="inline-block mt-6 px-6 py-2 rounded-lg bg-surface-muted text-copy hover:bg-surface border border-border transition-colors">
              Ir a Iniciar Sesión
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm text-copy-muted mb-1">
                  Nombre
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Tu nombre o estudio"
                />
              </div>
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
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Creando cuenta..." : "Registrarse"}
              </button>
            </form>

            {error && (
              <p className="mt-3 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <p className="mt-4 text-sm text-copy-muted text-center">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-brand hover:underline">
                Inicia sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
