import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import db from "../config/firebase.js"
import { JWT_SECRET } from "../middlewares/middleware.auth.js"
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail, sendVerificationEmail } from "../services/email/email.service.js"
import {
  generateResetToken,
  validateResetToken,
  markTokenAsUsed
} from "../services/token/reset-token.service.js"
import {
  generateVerificationToken,
  validateVerificationToken,
  markVerificationTokenAsUsed
} from "../services/token/verification-token.service.js"

const USERS_COLLECTION = "users"
const JWT_EXPIRES_IN = "7d"

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nombre, correo y contraseña son requeridos" })
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" })
    }

    // Sanitize and normalize email
    const normalizedEmail = String(email).trim().toLowerCase()
    const sanitizedName = String(name).trim().slice(0, 100)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Formato de correo inválido" })
    }

    const existingSnap = await db
      .collection(USERS_COLLECTION)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      return res.status(409).json({ message: "El correo ya está registrado" })
    }

    const passwordHash = await bcrypt.hash(password, 12) // Increased rounds for better security

    const userRef = await db.collection(USERS_COLLECTION).add({
      name: sanitizedName,
      email: normalizedEmail,
      passwordHash,
      avatarUrl: null,
      role: "user",
      isVerified: false,
      createdAt: new Date().toISOString(),
    })

    const user = {
      id: userRef.id,
      name: sanitizedName,
      email: normalizedEmail,
      avatarUrl: null,
      role: "user",
    }

    try {
      const { token: verificationToken } = await generateVerificationToken(user.id, normalizedEmail)
      await sendVerificationEmail(normalizedEmail, verificationToken, user.id, sanitizedName)
    } catch (e) {
      console.error("[Register] Error sending verification email:", e.message)
    }

    return res.status(201).json({ 
      success: true, 
      message: "Registro exitoso. Revisa tu correo electrónico para verificar tu cuenta.",
      user: { id: user.id, email: user.email } // no auth token
    })
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

    // Generic error message to prevent user enumeration
    if (snap.empty) {
      return res.status(401).json({ message: "Credenciales inválidas" })
    }

    const doc = snap.docs[0]
    const data = doc.data()

    const isMatch = await bcrypt.compare(password, data.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" })
    }

    if (data.isVerified === false) {
      return res.status(403).json({ 
        message: "Por favor verifica tu correo electrónico para poder iniciar sesión", 
        unverified: true 
      })
    }

    const user = {
      id: doc.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl || null,
      role: data.role || "user",
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email, role: user.role },
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
      role: data.role || "user",
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
      updates.name = String(name).trim().slice(0, 100)
    }

    if (email && String(email).trim()) {
      const normalizedEmail = String(email).trim().toLowerCase()

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: "Formato de correo inválido" })
      }

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
      // Validate avatarUrl if provided
      if (avatarUrl) {
        try {
          const url = new URL(avatarUrl)
          // Only allow HTTPS URLs
          if (url.protocol !== 'https:') {
            return res.status(400).json({ message: "La URL del avatar debe usar HTTPS" })
          }
          updates.avatarUrl = avatarUrl
        } catch {
          return res.status(400).json({ message: "URL de avatar inválida" })
        }
      } else {
        updates.avatarUrl = null
      }
    }

    if (password && String(password).trim()) {
      if (password.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" })
      }
      updates.passwordHash = await bcrypt.hash(password, 12)
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
      role: data.role || "user",
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return res.json({ user, token })
  } catch (error) {
    return next(error)
  }
}
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: "El correo es requerido" })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      // Return generic message to prevent user enumeration
      return res.json({ success: true, message: "Si el correo existe, recibirás un enlace de reset" })
    }

    // Find user by email
    const snap = await db
      .collection(USERS_COLLECTION)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get()

    // Always return success message (prevent user enumeration)
    if (snap.empty) {
      console.log(`[Forgot Password] Email not found: ${normalizedEmail}`)
      return res.json({ success: true, message: "Si el correo existe, recibirás un enlace de reset" })
    }

    const userDoc = snap.docs[0]
    try {
      // Generate reset token
      const { token, expiresAt } = await generateResetToken(userDoc.id, normalizedEmail)

      // Send email with reset link
      await sendPasswordResetEmail(normalizedEmail, token, userDoc.id)

      console.log(`[Forgot Password] Reset email sent to ${normalizedEmail}`)
      return res.json({ success: true, message: "Si el correo existe, recibirás un enlace de reset" })
    } catch (emailError) {
      console.error(`[Forgot Password] Failed to send email:`, emailError.message)
      // Return generic success even if email fails (don't reveal email issues)
      return res.json({ success: true, message: "Si el correo existe, recibirás un enlace de reset" })
    }
  } catch (error) {
    return next(error)
  }
}

export const resetPassword = async (req, res, next) => {
  try {
    const { token, userId, newPassword } = req.body

    if (!token || !userId || !newPassword) {
      return res.status(400).json({ message: "Token, userId y newPassword son requeridos" })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" })
    }

    // Validate reset token
    const tokenValidation = await validateResetToken(token, userId)
    if (!tokenValidation.valid) {
      return res.status(400).json({ message: tokenValidation.reason || "Token inválido o expirado" })
    }

    // Get user document
    const userRef = db.collection(USERS_COLLECTION).doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      console.warn(`[Reset Password] User not found: ${userId}`)
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    const userData = userDoc.data()

    // Validate that new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, userData.passwordHash)
    if (isSamePassword) {
      return res.status(400).json({ message: "La nueva contraseña no puede ser igual a la anterior" })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12)

    // Update user password
    await userRef.update({
      passwordHash: newPasswordHash,
      updatedAt: new Date().toISOString()
    })

    // Mark token as used
    await markTokenAsUsed(token, userId)

    // Send confirmation email (non-blocking)
    try {
      await sendPasswordResetConfirmationEmail(userData.email, userData.name)
    } catch (emailError) {
      console.warn(`[Reset Password] Failed to send confirmation email:`, emailError.message)
      // Don't fail the reset if confirmation email fails
    }

    console.log(`[Reset Password] Password reset successful for user: ${userId}`)
    return res.json({ success: true, message: "Contraseña actualizada exitosamente" })
  } catch (error) {
    return next(error)
  }
}

export const verifyEmail = async (req, res, next) => {
  try {
    const { token, userId } = req.body

    if (!token || !userId) {
      return res.status(400).json({ message: "Token y userId son requeridos" })
    }

    const tokenValidation = await validateVerificationToken(token, userId)
    if (!tokenValidation.valid) {
      return res.status(400).json({ message: tokenValidation.reason || "Token inválido o expirado" })
    }

    const userRef = db.collection(USERS_COLLECTION).doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    await userRef.update({
      isVerified: true,
      updatedAt: new Date().toISOString()
    })

    await markVerificationTokenAsUsed(token, userId)

    return res.json({ success: true, message: "Correo verificado exitosamente. Ya puedes iniciar sesión." })
  } catch (error) {
    return next(error)
  }
}
