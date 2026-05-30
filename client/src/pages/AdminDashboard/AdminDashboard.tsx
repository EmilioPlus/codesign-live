import { useEffect, useState } from "react"
import { listUsersApi, updateUserRoleApi, type AdminUser } from "../../services/admin"
import { useAuth } from "../../context/AuthContext"
import { Navigate } from "react-router-dom"

export default function AdminDashboard() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await listUsersApi()
      setUsers(data.users)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Error al cargar la lista de usuarios")
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      if (userId === user?.id) {
        alert("No puedes cambiar tu propio rol")
        return
      }
      await updateUserRoleApi(userId, newRole)
      setUsers(u => u.map(usr => usr.id === userId ? { ...usr, role: newRole } : usr))
    } catch (err: any) {
      alert(err.message || "Error al actualizar el usuario")
    }
  }

  if (user?.role !== "super_admin") {
    return <Navigate to="/" replace />
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-copy">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-brand">Panel de Administración</h1>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-10 text-copy-muted">Cargando usuarios...</div>
      ) : (
        <div className="bg-surface-panel rounded-lg border border-border overflow-hidden shadow-lg">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm min-w-[500px] sm:min-w-0">
              <thead className="bg-surface-muted text-copy-muted font-semibold">
                <tr>
                  <th className="px-4 py-3.5 border-b border-border">Nombre</th>
                  <th className="px-4 py-3.5 border-b border-border">Correo</th>
                  <th className="px-4 py-3.5 border-b border-border">Rol</th>
                  <th className="px-4 py-3.5 border-b border-border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((usr) => (
                  <tr key={usr.id} className="border-b border-border last:border-b-0 hover:bg-surface-hover/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">{usr.name}</td>
                    <td className="px-4 py-3.5 text-copy-muted whitespace-nowrap">{usr.email}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider
                        ${usr.role === "super_admin" ? "bg-brand/20 text-brand border border-brand/30" : "bg-surface-muted border border-border text-copy-muted"}`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={usr.role}
                        onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                        disabled={usr.id === user.id}
                        className="bg-surface text-copy border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 transition-all cursor-pointer font-medium"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="user">User</option>
                        <option value="spectator">Spectator</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-copy-muted font-medium">
                      No hay usuarios registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
