import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import db from "../../config/firebase.js"

const USERS_COLLECTION = "users"
const JWT_SECRET = process.env.JWT_SECRET || "codesign-live-secret-change-in-production"
const JWT_EXPIRES_IN = "7d"

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nombre, correo y contraseña son requeridos" })
    }
    const normalizedEmail = String(email).trim().toLowerCase()

    const existingSnap = await db
      .collection(USERS_COLLECTION)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      return res.status(409).json({ message: "El correo ya está registrado" })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const userRef = await db.collection(USERS_COLLECTION).add({
      name,
      email: normalizedEmail,
      passwordHash,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    })

    const user = {
      id: userRef.id,
      name,
      email: normalizedEmail,
      avatarUrl: null,
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return res.status(201).json({ user, token })
  } catch (error) {
    return next(error)
  }
}

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Correo y contraseña son requeridos" })
    }
    const normalizedEmail = String(email).trim().toLowerCase()

    const snap = await db
      .collection(USERS_COLLECTION)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get()

    if (snap.empty) {
      return res.status(404).json({
        message: "Usuario no registrado. Regístrate para que disfrutes de las colaboraciones.",
      })
    }

    const doc = snap.docs[0]
    const data = doc.data()

    const isMatch = await bcrypt.compare(password, data.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" })
    }

    const user = {
      id: doc.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl || null,
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return res.json({ user, token })
  } catch (error) {
    return next(error)
  }
}

export const getMe = async (req, res, next) => {
  try {
    const doc = await db.collection(USERS_COLLECTION).doc(req.user.id).get()
    if (!doc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }
    const data = doc.data()
    return res.json({
      id: doc.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl || null,
    })
  } catch (error) {
    return next(error)
  }
}

export const updateMe = async (req, res, next) => {
  try {
    const { name, email, password, avatarUrl } = req.body
    const updates = {}

    if (name && String(name).trim()) {
      updates.name = String(name).trim()
    }

    if (email && String(email).trim()) {
      const normalizedEmail = String(email).trim().toLowerCase()

      const snap = await db
        .collection(USERS_COLLECTION)
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get()

      if (!snap.empty && snap.docs[0].id !== req.user.id) {
        return res.status(409).json({ message: "El correo ya está en uso" })
      }

      updates.email = normalizedEmail
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl || null
    }

    if (password && String(password).trim()) {
      updates.passwordHash = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No hay cambios para actualizar" })
    }

    updates.updatedAt = new Date().toISOString()

    const userRef = db.collection(USERS_COLLECTION).doc(req.user.id)
    await userRef.update(updates)

    const updatedDoc = await userRef.get()
    const data = updatedDoc.data()
    const user = {
      id: updatedDoc.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl || null,
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return res.json({ user, token })
  } catch (error) {
    return next(error)
  }
}

