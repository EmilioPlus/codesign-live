import crypto from "crypto"
import db from "../../config/firebase.js"

const PASSWORD_RESETS_COLLECTION = "passwordResets"
// Expected value: plain number of hours (e.g. 1). Do NOT use "1h" format.
const TOKEN_EXPIRATION_HOURS = Math.max(1, parseInt(process.env.PASSWORD_RESET_EXPIRES_IN ?? "1", 10) || 1)

/**
 * Hash a reset token using SHA256 (for secure storage)
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * Generate a secure reset token
 * @param {string} userId - Firestore user document ID
 * @param {string} email - User email
 * @returns {Promise<{token: string, expiresAt: Date, hashedToken: string}>}
 */
export const generateResetToken = async (userId, email) => {
  try {
    // Generate random token
    const token = crypto.randomBytes(32).toString("hex")
    const hashedToken = hashToken(token)

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000)

    // Save token to Firestore
    const docRef = await db.collection(PASSWORD_RESETS_COLLECTION).add({
      userId,
      email,
      token: hashedToken,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    console.log(`[Reset Token] Generated for user ${userId} (email: ${email})`)

    return {
      token, // Return plain token to send in email
      expiresAt,
      docId: docRef.id,
      hashedToken
    }
  } catch (error) {
    console.error("[Reset Token Error] Failed to generate:", error.message)
    throw error
  }
}

/**
 * Validate a reset token
 * @param {string} token - Plain token from email
 * @param {string} userId - Firestore user document ID
 * @returns {Promise<{valid: boolean, docId: string, expiresAt: Date}>}
 */
export const validateResetToken = async (token, userId) => {
  try {
    const hashedToken = hashToken(token)
    const now = new Date()

    // Find the token document
    const snap = await db
      .collection(PASSWORD_RESETS_COLLECTION)
      .where("token", "==", hashedToken)
      .where("userId", "==", userId)
      .where("used", "==", false)
      .limit(1)
      .get()

    if (snap.empty) {
      console.warn(`[Reset Token] Token not found for userId: ${userId}`)
      return { valid: false, reason: "Token not found or already used" }
    }

    const doc = snap.docs[0]
    const data = doc.data()

    // Check if token is expired
    const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt)
    if (expiresAt < now) {
      console.warn(`[Reset Token] Token expired for userId: ${userId}`)
      return { valid: false, reason: "Token has expired" }
    }

    console.log(`[Reset Token] Valid token found for userId: ${userId}`)

    return {
      valid: true,
      docId: doc.id,
      expiresAt
    }
  } catch (error) {
    console.error("[Reset Token Error] Failed to validate:", error.message)
    throw error
  }
}

/**
 * Mark a reset token as used after successful password change
 * @param {string} token - Plain token
 * @param {string} userId - Firestore user document ID
 * @returns {Promise<boolean>}
 */
export const markTokenAsUsed = async (token, userId) => {
  try {
    const hashedToken = hashToken(token)

    // Find and update the token
    const snap = await db
      .collection(PASSWORD_RESETS_COLLECTION)
      .where("token", "==", hashedToken)
      .where("userId", "==", userId)
      .limit(1)
      .get()

    if (snap.empty) {
      console.warn(`[Reset Token] Token not found to mark as used: ${userId}`)
      return false
    }

    await snap.docs[0].ref.update({
      used: true,
      usedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    console.log(`[Reset Token] Marked as used for userId: ${userId}`)
    return true
  } catch (error) {
    console.error("[Reset Token Error] Failed to mark as used:", error.message)
    throw error
  }
}

/**
 * Clean up expired reset tokens (can be called periodically or by Cloud Task)
 * @returns {Promise<number>} Number of tokens deleted
 */
export const cleanupExpiredTokens = async () => {
  try {
    const now = new Date()

    // Find expired tokens
    const snap = await db
      .collection(PASSWORD_RESETS_COLLECTION)
      .where("expiresAt", "<", now)
      .get()

    // Delete them
    let deletedCount = 0
    const batch = db.batch()

    snap.docs.forEach(doc => {
      batch.delete(doc.ref)
      deletedCount++
    })

    if (deletedCount > 0) {
      await batch.commit()
      console.log(`[Reset Token] Cleaned up ${deletedCount} expired token(s)`)
    }

    return deletedCount
  } catch (error) {
    console.error("[Reset Token Error] Failed to cleanup:", error.message)
    return 0
  }
}
