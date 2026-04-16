import { useState } from "react"
import { forgotPasswordApi } from "@/services/api"

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const ForgotPasswordModal = ({ isOpen, onClose, onSuccess }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!email.trim()) {
        setError("Por favor ingresa tu correo")
        setIsLoading(false)
        return
      }

      await forgotPasswordApi({ email: email.trim() })
      setIsSubmitted(true)

      // Auto close after 3 seconds
      setTimeout(() => {
        handleClose()
        onSuccess?.()
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar tu solicitud")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail("")
    setError(null)
    setIsSubmitted(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-panel border border-border rounded-lg p-6 w-full max-w-md shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-copy">Recuperar Contraseña</h2>
          <button
            onClick={handleClose}
            className="text-copy-muted hover:text-copy text-2xl leading-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {!isSubmitted ? (
          <>
            {/* Description */}
            <p className="text-copy-muted text-sm mb-6">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-copy mb-2">
                  Correo Electrónico
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu-email@example.com"
                  className="w-full bg-surface-muted text-copy px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand text-white font-medium py-2 rounded-lg hover:bg-brand-hover disabled:opacity-60 transition-colors"
              >
                {isLoading ? "Enviando..." : "Enviar Enlace"}
              </button>
            </form>

            {/* Security message */}
            <p className="text-xs text-copy-muted mt-6 text-center">
              🔐 Tu contraseña está segura. El enlace expirará en 1 hora por motivos de seguridad.
            </p>
          </>
        ) : (
          <>
            {/* Success Message */}
            <div className="text-center space-y-4">
              <div className="text-4xl">✓</div>
              <h3 className="text-lg font-semibold text-copy">¡Correo Enviado!</h3>
              <p className="text-copy-muted text-sm">
                Revisa tu bandeja de entrada (o spam) para encontrar el enlace de recuperación.
              </p>
              <p className="text-xs text-copy-muted">
                El enlace expirará en 1 hora.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full mt-6 bg-surface-muted text-copy border border-border font-medium py-2 rounded-lg hover:bg-surface transition-colors"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
