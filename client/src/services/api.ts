export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api"
export const WS_URL = API_URL.replace(/^http/, "ws").replace("/api", "/ws")

const AUTH_KEY = "codesign-live-auth"

export function getStoredToken(): string | null {
  try {
    const stored = sessionStorage.getItem(AUTH_KEY)
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
  description?: string
  thumbnailUrl?: string | null
  user: string
  userId: string
  userAvatarUrl?: string | null
  viewers: number
  live: boolean
}

export const getStreamsApi = async (): Promise<{ streams: Stream[] }> => {
  const response = await fetch(`${API_URL}/streams`, {
    credentials: "include",
  })
  return handleResponse(response)
}

export const createStreamApi = async (payload?: {
  title?: string
  description?: string
  thumbnailUrl?: string
}): Promise<{ stream: Stream & { userId: string; viewerCount: number; createdAt: string } }> => {
  const title = payload?.title?.trim() || "Transmisión en vivo"
  const response = await fetch(`${API_URL}/streams`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      title,
      description: payload?.description?.trim() || "",
      thumbnailUrl: payload?.thumbnailUrl?.trim() || undefined,
    }),
  })
  return handleResponse(response)
}

export const updateStreamMetadataApi = async (
  streamId: string,
  payload: { title?: string; description?: string; thumbnailUrl?: string | null }
): Promise<Stream> => {
  const body: Record<string, string | null> = {}
  if (payload.title !== undefined) body.title = payload.title
  if (payload.description !== undefined) body.description = payload.description
  if (payload.thumbnailUrl !== undefined) body.thumbnailUrl = payload.thumbnailUrl
  const response = await fetch(`${API_URL}/streams/${streamId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
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

// ——— Foros ———
export type Forum = {
  id: string
  streamId: string
  createdBy: string
  title: string
  description: string
  type: "poll" | "discussion"
  options: { id: string; text: string }[]
  createdAt: string
  expiresAt: string
  status: "active" | "closed"
}

export const createForumApi = async (
  streamId: string,
  payload: { title: string; description?: string; type: "poll" | "discussion"; options?: string[] }
): Promise<{ forum: Forum }> => {
  const response = await fetch(`${API_URL}/streams/${streamId}/forums`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      title: payload.title.trim(),
      description: payload.description?.trim() || "",
      type: payload.type,
      options: payload.options || [],
    }),
  })
  return handleResponse(response)
}

export const getActiveForumApi = async (streamId: string): Promise<{ forum: Forum | null }> => {
  const response = await fetch(`${API_URL}/streams/${streamId}/forums/active`, { credentials: "include" })
  return handleResponse(response)
}

export const voteForumApi = async (forumId: string, optionId: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/forums/${forumId}/vote`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ optionId }),
  })
  return handleResponse(response)
}

export const addForumPostApi = async (forumId: string, text: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/forums/${forumId}/posts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text: text.trim() }),
  })
  return handleResponse(response)
}

export type ForumResults = {
  forum: Forum & { totalVotes?: number }
  results?: { optionId: string; text: string; count: number }[]
  posts?: { id: string; userName: string; text: string; createdAt: string }[]
}

export const getForumResultsApi = async (forumId: string): Promise<ForumResults> => {
  const response = await fetch(`${API_URL}/forums/${forumId}/results`, {
    headers: authHeaders(),
  })
  return handleResponse(response)
}

// ——— Proyectos ———

import type { ProjectFile } from "../context/StreamRoomContext"

export const uploadFileApi = async (file: File): Promise<{ fileUrl: string }> => {
  const formData = new FormData()
  formData.append("file", file)
  
  const token = getStoredToken()
  const headers: HeadersInit = {}
  if (token) headers["Authorization"] = `Bearer ${token}`

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers,
    body: formData,
  })
  return handleResponse(response)
}

export const createProjectApi = async (data: { userId: string, title: string, fileUrl: string, type: "2d" | "3d" }): Promise<ProjectFile> => {
  const response = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}

export const getUserProjectsApi = async (userId: string): Promise<ProjectFile[]> => {
  const response = await fetch(`${API_URL}/projects/${userId}`, {
    method: "GET",
    headers: authHeaders(),
  })
  return handleResponse(response)
}

export const deleteProjectApi = async (projectId: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  return handleResponse(response)
}