import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { verifyEmailApi } from "../../services/api"

export default function VerifyEmail() {
  const { userId, token } = useParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!userId || !token) {
      setStatus("error")
      setMessage("Enlace inválido o incompleto.")
      return
    }

    let isMounted = true

    verifyEmailApi({ userId, token })
      .then((res) => {
        if (isMounted) {
          setStatus("success")
          setMessage(res.message)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setStatus("error")
          setMessage(err instanceof Error ? err.message : "Error al verificar el correo.")
        }
      })

    return () => {
      isMounted = false
    }
  }, [userId, token])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-surface-panel border border-border rounded-lg p-6 text-center">
        {status === "loading" && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4 animate-pulse">
              <span className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin"></span>
            </div>
            <h1 className="text-xl font-semibold text-copy mb-2">Verificando...</h1>
            <p className="text-sm text-copy-muted">Por favor espera mientras validamos tu correo electrónico.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand/10 text-brand mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-copy mb-2">¡Cuenta verificada!</h1>
            <p className="text-sm text-copy-muted mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block py-2 px-6 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover transition-colors"
            >
              Iniciar sesión
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/10 text-danger mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-copy mb-2">Error de verificación</h1>
            <p className="text-sm text-danger mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block py-2 px-6 rounded-lg bg-surface-muted text-copy border border-border hover:bg-surface transition-colors"
            >
              Volver al Login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
