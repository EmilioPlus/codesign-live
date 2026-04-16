import { API_URL, authHeaders, handleResponse } from "./api"

export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export const listUsersApi = async (): Promise<{ users: AdminUser[] }> => {
  const response = await fetch(`${API_URL}/admin/users`, {
    headers: authHeaders(),
  })
  return handleResponse(response)
}

export const updateUserRoleApi = async (userId: string, role: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  })
  return handleResponse(response)
}
