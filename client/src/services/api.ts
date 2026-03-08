const API_URL = "http://localhost:4000/api"

const AUTH_KEY = "codesign-live-auth"

export function getStoredToken(): string | null {
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (!stored) return null
    const data = JSON.parse(stored)
    return data?.token ?? null
  } catch {
    return null
  }
}

function authHeaders(): HeadersInit {
  const token = getStoredToken()
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json()
      const message = (data && (data.message as string)) || "Error en la petición"
      throw new Error(message)
    }
    throw new Error("Error en la petición")
  }
  return response.json()
}

export const getHealth = async () => {
  const response = await fetch(`${API_URL}/rutas`, {
    credentials: "include",
  })
  return handleResponse(response)
}

export type AuthUser = {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

export const registerApi = async (payload: {
  name: string
  email: string
  password: string
}): Promise<{ user: AuthUser; token: string }> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export const loginApi = async (payload: {
  email: string
  password: string
}): Promise<{ user: AuthUser; token: string }> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export const getMeApi = async (): Promise<AuthUser> => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: authHeaders(),
  })
  const data = await handleResponse(response)
  return data as AuthUser
}

export const updateMeApi = async (payload: {
  name?: string
  email?: string
  password?: string
  avatarUrl?: string | null
}): Promise<{ user: AuthUser; token: string }> => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export type Stream = {
  id: string
  title: string
  user: string
  viewers: number
  live: boolean
}

export const getStreamsApi = async (): Promise<{ streams: Stream[] }> => {
  const response = await fetch(`${API_URL}/streams`, {
    credentials: "include",
  })
  return handleResponse(response)
}

export const createStreamApi = async (title?: string): Promise<{ stream: Stream & { userId: string; viewerCount: number; createdAt: string } }> => {
  const response = await fetch(`${API_URL}/streams`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title: title || "Transmisión en vivo" }),
  })
  return handleResponse(response)
}

export const endStreamApi = async (streamId: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/streams/${streamId}/end`, {
    method: "PATCH",
    headers: authHeaders(),
  })
  return handleResponse(response)
}