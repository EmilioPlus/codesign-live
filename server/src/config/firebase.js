import admin from "firebase-admin"

// Initialize Firebase Admin SDK
// Prefer environment variable for security - NEVER commit service account keys to repository
let serviceAccount

try {
  // Try to load from environment variable first (production-safe)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  } else {
    // Fall back to file for local development ONLY
    // IMPORTANT: Firebasekey.json should be in .gitignore and NEVER committed to repository
    // TODO: Remove this fallback in production - use only environment variable
    try {
      const { createRequire } = await import("module")
      const require = createRequire(import.meta.url)
      serviceAccount = require("../../Firebasekey.json")

      console.warn("\n" + "=".repeat(70))
      console.warn("WARNING: Using Firebasekey.json for credentials.")
      console.warn("This file should NEVER be committed to version control.")
      console.warn("Set FIREBASE_SERVICE_ACCOUNT environment variable instead.")
      console.warn("=".repeat(70) + "\n")
    } catch (fileError) {
      console.error("\n" + "=".repeat(70))
      console.error("ERROR: No Firebase credentials found!")
      console.error("Set FIREBASE_SERVICE_ACCOUNT environment variable")
      console.error("or place Firebasekey.json in server/ directory for local development.")
      console.error("=".repeat(70) + "\n")
      process.exit(1)
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "codesign-live.firebasestorage.app"
  })

} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error.message)
  process.exit(1)
}

const db = admin.firestore()
export const bucket = admin.storage().bucket()

export default db