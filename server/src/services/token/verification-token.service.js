import crypto from "crypto"
import db from "../../config/firebase.js"

const VERIFY_RESETS_COLLECTION = "emailVerifications"
const TOKEN_EXPIRATION_HOURS = 24

/**
 * Hash a verification token using SHA256 (for secure storage)
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * Generate a secure verification token
 * @param {string} userId - Firestore user document ID
 * @param {string} email - User email
 * @returns {Promise<{token: string, expiresAt: Date, hashedToken: string}>}
 */
export const generateVerificationToken = async (userId, email) => {
  try {
    const token = crypto.randomBytes(32).toString("hex")
    const hashedToken = hashToken(token)

    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000)

    const docRef = await db.collection(VERIFY_RESETS_COLLECTION).add({
      userId,
      email,
      token: hashedToken,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    console.log(`[Verification Token] Generated for user ${userId} (email: ${email})`)

    return {
      token,
      expiresAt,
      docId: docRef.id,
      hashedToken
    }
  } catch (error) {
    console.error("[Verification Token Error] Failed to generate:", error.message)
    throw error
  }
}

/**
 * Validate a verification token
 * @param {string} token - Plain token from email
 * @param {string} userId - Firestore user document ID
 * @returns {Promise<{valid: boolean, docId: string, expiresAt: Date, reason?: string}>}
 */
export const validateVerificationToken = async (token, userId) => {
  try {
    const hashedToken = hashToken(token)
    const now = new Date()

    const snap = await db
      .collection(VERIFY_RESETS_COLLECTION)
      .where("token", "==", hashedToken)
      .where("userId", "==", userId)
      .where("used", "==", false)
      .limit(1)
      .get()

    if (snap.empty) {
      console.warn(`[Verification Token] Token not found for userId: ${userId}`)
      return { valid: false, reason: "El enlace de verificación no es válido o ya fue utilizado." }
    }

    const doc = snap.docs[0]
    const data = doc.data()

    const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt)
    if (expiresAt < now) {
      console.warn(`[Verification Token] Token expired for userId: ${userId}`)
      return { valid: false, reason: "El enlace de verificación ha expirado." }
    }

    return {
      valid: true,
      docId: doc.id,
      expiresAt
    }
  } catch (error) {
    console.error("[Verification Token Error] Failed to validate:", error.message)
    throw error
  }
}

/**
 * Mark a verification token as used after successful validation
 * @param {string} token - Plain token
 * @param {string} userId - Firestore user document ID
 * @returns {Promise<boolean>}
 */
export const markVerificationTokenAsUsed = async (token, userId) => {
  try {
    const hashedToken = hashToken(token)

    const snap = await db
      .collection(VERIFY_RESETS_COLLECTION)
      .where("token", "==", hashedToken)
      .where("userId", "==", userId)
      .limit(1)
      .get()

    if (snap.empty) {
      return false
    }

    await snap.docs[0].ref.update({
      used: true,
      usedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return true
  } catch (error) {
    console.error("[Verification Token Error] Failed to mark as used:", error.message)
    throw error
  }
}

export const cleanupExpiredVerificationTokens = async () => {
  try {
    const now = new Date()

    const snap = await db
      .collection(VERIFY_RESETS_COLLECTION)
      .where("expiresAt", "<", now)
      .get()

    let deletedCount = 0
    const batch = db.batch()

    snap.docs.forEach(doc => {
      batch.delete(doc.ref)
      deletedCount++
    })

    if (deletedCount > 0) {
      await batch.commit()
      console.log(`[Verification Token] Cleaned up ${deletedCount} expired token(s)`)
    }

    return deletedCount
  } catch (error) {
    console.error("[Verification Token Error] Failed to cleanup:", error.message)
    return 0
  }
}
