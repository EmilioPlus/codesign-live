export const API_URL = import.meta.env.VITE_API_URL || (window.location.origin + "/api")
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

export function authHeaders(): HeadersInit {
  const token = getStoredToken()
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

export async function handleResponse(response: Response) {
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
  role: string
}

export const registerApi = async (payload: {
  name: string
  email: string
  password: string
}): Promise<{ success: boolean; message: string; user: { id: string; email: string } }> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export const verifyEmailApi = async (payload: {
  userId: string
  token: string
}): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/auth/verify-email`, {
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

export const forgotPasswordApi = async (payload: {
  email: string
}): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export const resetPasswordApi = async (payload: {
  token: string
  userId: string
  newPassword: string
}): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

// ── STREAMER SOCIAL ──────────────────────────────────────────────────────────

export interface StreamerGoal {
  title: string
  current: number
  target: number
  icon?: string
}

export interface StreamerProfile {
  id: string
  name: string
  avatarUrl: string | null
  followerCount: number
  subscriberCount: number
  bio: string
  goals: StreamerGoal[]
}

export const getStreamerProfileApi = async (streamerId: string): Promise<StreamerProfile> => {
  const response = await fetch(`${API_URL}/streamer/${streamerId}/profile`, {
    headers: authHeaders(),
  })
  return handleResponse(response)
}

export const updateStreamerProfileApi = async (data: { bio?: string; goals?: StreamerGoal[] }) => {
  const response = await fetch(`${API_URL}/streamer/profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}

export const toggleFollowApi = async (streamerId: string): Promise<{ following: boolean; followerCount: number }> => {
  const response = await fetch(`${API_URL}/streamer/${streamerId}/follow`, {
    method: "POST",
    headers: authHeaders(),
  })
  return handleResponse(response)
}

export const getFollowStatusApi = async (streamerId: string): Promise<{ following: boolean; followerCount: number }> => {
  const response = await fetch(`${API_URL}/streamer/${streamerId}/follow-status`, {
    headers: authHeaders(),
  })
  return handleResponse(response)
}

export const subscribeToStreamerApi = async (streamerId: string): Promise<{ subscribed: boolean; subscriberCount: number }> => {
  const response = await fetch(`${API_URL}/streamer/${streamerId}/subscribe`, {
    method: "POST",
    headers: authHeaders(),
  })
  return handleResponse(response)
}

export const getSubscribeStatusApi = async (streamerId: string): Promise<{ subscribed: boolean; subscriberCount: number }> => {
  const response = await fetch(`${API_URL}/streamer/${streamerId}/subscribe-status`, {
    headers: authHeaders(),
  })
  return handleResponse(response)
}

export const giftSubscriptionApi = async (streamerId: string, recipientName: string) => {
  const response = await fetch(`${API_URL}/streamer/${streamerId}/gift-sub`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ recipientName }),
  })
  return handleResponse(response)
}

export const searchUsersForGiftApi = async (streamerId: string, q: string): Promise<{ users: { id: string; name: string; avatarUrl: string | null }[] }> => {
  const response = await fetch(`${API_URL}/streamer/${streamerId}/search-users?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(),
  })
  return handleResponse(response)
}