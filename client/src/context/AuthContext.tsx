import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { loginApi, registerApi, type AuthUser } from "../services/api"

const AUTH_KEY = "codesign-live-auth"

type User = AuthUser

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  setUserFromServer: (user: User, token?: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readInitialUser(): User | null {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(AUTH_KEY)
  if (!stored) return null
  try {
    const data = JSON.parse(stored)
    if (data?.user && data?.token) return data.user as User
    window.localStorage.removeItem(AUTH_KEY)
    return null
  } catch {
    window.localStorage.removeItem(AUTH_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readInitialUser())

  useEffect(() => {
    // Limpieza de la clave antigua usada antes
    localStorage.removeItem("codesign-live-user")
  }, [])

  const setUserFromServer = (nextUser: User, token?: string) => {
    let finalToken = token
    if (!finalToken) {
      try {
        const stored = localStorage.getItem(AUTH_KEY)
        if (stored) {
          const data = JSON.parse(stored)
          if (data?.token) finalToken = data.token as string
        }
      } catch {
        // ignore
      }
    }
    if (!finalToken) return
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user: nextUser, token: finalToken }))
    setUser(nextUser)
  }

  const login = async (email: string, password: string) => {
    const { user, token } = await loginApi({ email, password })
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }))
    setUser(user)
  }

  const register = async (name: string, email: string, password: string) => {
    const { user, token } = await registerApi({ name, email, password })
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }))
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setUserFromServer,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}
