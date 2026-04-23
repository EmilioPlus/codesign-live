import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { resetPasswordApi } from "../../services/api"

type ResetPasswordParams = Record<string, string | undefined> & {
  userId?: string
  token?: string
}

export const ResetPassword = () => {
  const navigate = useNavigate()
  const params = useParams<ResetPasswordParams>()
  const { userId, token } = params

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Validate token and userId on mount
  useEffect(() => {
    if (!userId || !token) {
      setError("Enlace de recuperación inválido. Por favor, solicita un nuevo enlace.")
    }
  }, [userId, token])

  const validateForm = (): boolean => {
    setValidationError(null)

    if (!newPassword.trim()) {
      setValidationError("Por favor ingresa tu nueva contraseña")
      return false
    }

    if (newPassword.length < 8) {
      setValidationError("La contraseña debe tener al menos 8 caracteres")
      return false
    }

    if (!confirmPassword.trim()) {
      setValidationError("Por favor confirma tu contraseña")
      return false
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Las contraseñas no coinciden")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (!userId || !token) {
        setError("Información de recuperación inválida")
        return
      }

      await resetPasswordApi({
        userId,
        token,
        newPassword
      })

      setIsSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login", { replace: true })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-muted to-surface-panel flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-panel border border-border rounded-lg p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-copy mb-2">🔐 Restablecer Contraseña</h1>
            <p className="text-copy-muted text-sm">Crea una nueva contraseña para tu cuenta</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <p className="text-sm text-danger">{error}</p>
              {!userId || !token ? (
                <button
                  onClick={() => navigate("/login")}
                  className="mt-3 text-sm text-brand hover:underline font-medium"
                >
                  Ir a iniciar sesión →
                </button>
              ) : null}
            </div>
          )}

          {!isSuccess && !error ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-copy mb-2">
                  Nueva Contraseña
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-copy mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu contraseña"
                  className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                  <p className="text-sm text-danger">{validationError}</p>
                </div>
              )}

              {/* Password Requirements */}
              <div className="bg-surface-muted p-3 rounded-lg border border-border">
                <p className="text-xs font-medium text-copy-muted mb-2">Requisitos:</p>
                <ul className="text-xs text-copy-muted space-y-1">
                  <li>✓ Mínimo 8 caracteres</li>
                  <li>✓ Usa mayúsculas, minúsculas y números para mayor seguridad</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand text-white font-medium py-2 rounded-lg hover:bg-brand-hover disabled:opacity-60 transition-colors"
              >
                {isLoading ? "Procesando..." : "Restablecer Contraseña"}
              </button>
            </form>
          ) : isSuccess ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">✓</div>
              <h2 className="text-lg font-semibold text-copy">¡Contraseña Actualizada!</h2>
              <p className="text-copy-muted text-sm">
                Tu contraseña ha sido restablecida exitosamente.
              </p>
              <p className="text-xs text-copy-muted">
                Redirigiendo a iniciar sesión...
              </p>
            </div>
          ) : null}

          {/* Footer Link */}
          {!isSuccess && !error && (
            <p className="text-center text-xs text-copy-muted mt-6">
              ¿Ya recuerdas tu contraseña?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-brand hover:underline font-medium"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-6 text-center text-xs text-copy-muted">
          <p>🔒 Esta conexión es segura y encriptada</p>
        </div>
      </div>
    </div>
  )
}
