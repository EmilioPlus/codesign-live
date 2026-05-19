import { useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { getMeApi, updateMeApi } from "../../services/api"

export default function Profile() {
  const { isAuthenticated, user, setUserFromServer } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [avatarUrl, setAvatarUrl] = useState<string | null>((user?.avatarUrl as string | null) ?? null)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    getMeApi()
      .then((me) => {
        setName(me.name)
        setEmail(me.email)
        setAvatarUrl((me.avatarUrl as string | null) ?? null)
        setUserFromServer(me)
      })
      .catch(() => {
        // si falla, usamos los datos que ya teníamos en contexto
      })
  }, [isAuthenticated, setUserFromServer])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const payload: {
        name?: string
        email?: string
        password?: string
        avatarUrl?: string | null
      } = {}
      if (name && name !== user?.name) payload.name = name
      if (email && email !== user?.email) payload.email = email
      if (avatarUrl !== undefined && avatarUrl !== (user?.avatarUrl as string | null)) {
        payload.avatarUrl = avatarUrl
      }
      if (password.trim()) payload.password = password

      if (Object.keys(payload).length === 0) {
        setSuccess("No hay cambios para guardar.")
        setLoading(false)
        return
      }

      const { user: updatedUser, token } = await updateMeApi(payload)
      setUserFromServer(updatedUser, token)
      setPassword("")
      setSuccess("Perfil actualizado correctamente.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al actualizar el perfil"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const avatarPreview = avatarUrl || null

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-copy mb-1">Perfil</h1>
          <p className="text-sm text-copy-muted">
            Gestiona tu información como usuario de CoDesign LIVE.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="px-3 py-1.5 rounded-lg bg-surface-muted text-copy text-sm hover:bg-surface border border-border transition-colors"
        >
          Atrás
        </button>
      </div>

      <form
          onSubmit={handleSubmit}
          className="bg-surface-panel border border-border rounded-lg p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-muted border border-border flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-copy">
                  {name ? name[0]?.toUpperCase() : "U"}
                </span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs text-copy-muted mb-1">
                URL de foto de perfil
              </label>
              <input
                type="url"
                value={avatarUrl ?? ""}
                onChange={(e) => setAvatarUrl(e.target.value || null)}
                placeholder="https://..."
                className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand text-sm"
              />
              <p className="text-[11px] text-copy-muted mt-1">
                Más adelante puedes conectar un gestor de archivos o storage externo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-copy-muted mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-copy-muted mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-copy-muted mb-1">
              Nueva contraseña (opcional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deja en blanco para mantener la actual"
              className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-copy bg-surface-muted border border-border rounded-lg px-3 py-2">
              {success}
            </p>
          )}
        </form>
    </div>
  )
}

