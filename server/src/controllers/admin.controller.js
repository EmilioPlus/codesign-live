import db from "../config/firebase.js"

const USERS_COLLECTION = "users"

export const listUsers = async (req, res, next) => {
  try {
    const snap = await db.collection(USERS_COLLECTION).get()
    const users = []
    snap.forEach((doc) => {
      const data = doc.data()
      users.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        role: data.role || "user",
        createdAt: data.createdAt,
      })
    })

    return res.json({ users })
  } catch (error) {
    return next(error)
  }
}

export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { role } = req.body

    const allowedRoles = ["super_admin", "user", "spectator"]
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Rol inválido" })
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: "No puedes cambiar tu propio rol" })
    }

    const userRef = db.collection(USERS_COLLECTION).doc(userId)
    const doc = await userRef.get()

    if (!doc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    await userRef.update({ role, updatedAt: new Date().toISOString() })

    return res.json({ message: "Rol actualizado exitosamente" })
  } catch (error) {
    return next(error)
  }
}
