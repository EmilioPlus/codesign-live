#!/usr/bin/env node
/**
 * Script para verificar el rol de un usuario en CoDesign LIVE
 * Cambiar NODE_PATH para que funcione desde anywhere
 */

import admin from "firebase-admin"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try different .env locations
const envPaths = [
  path.join(__dirname, "server", ".env"),
  path.join(__dirname, "..", "server", ".env"),
  path.join(process.cwd(), "server", ".env"),
  path.join(process.cwd(), ".env")
]

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

// Initialize Firebase
let serviceAccount
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} else {
  // Try different firebase key locations
  const keyPaths = [
    path.join(__dirname, "Firebasekey.json"),
    path.join(__dirname, "..", "Firebasekey.json"),
    path.join(process.cwd(), "server", "Firebasekey.json"),
    path.join(process.cwd(), "Firebasekey.json")
  ]

  let keyFound = false
  for (const keyPath of keyPaths) {
    if (fs.existsSync(keyPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"))
        keyFound = true
        break
      } catch (e) {
        // Continue to next path
      }
    }
  }

  if (!keyFound) {
    console.error("❌ Error: Firebase credentials not found")
    console.error("Set FIREBASE_SERVICE_ACCOUNT env variable or ensure Firebasekey.json exists")
    process.exit(1)
  }
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "codesign-live.firebasestorage.app"
  })
} catch (e) {
  // Silently continue if already initialized
}

const db = admin.firestore()
const USERS_COLLECTION = "users"

// Get email from command line arguments
const email = process.argv[2]?.toLowerCase().trim()

if (!email) {
  console.log("Usage: node check-user-role.js <email>")
  console.log("Example: node check-user-role.js jaiberhiguita4@gmail.com")
  process.exit(1)
}

console.log(`🔍 Verificando usuario: ${email}\n`)

try {
  const snap = await db
    .collection(USERS_COLLECTION)
    .where("email", "==", email)
    .limit(1)
    .get()

  if (snap.empty) {
    console.log(`❌ Usuario NO encontrado: ${email}`)
    process.exit(0)
  }

  const doc = snap.docs[0]
  const data = doc.data()

  console.log("✅ Usuario encontrado:\n")
  console.log(`  📧 Email: ${data.email}`)
  console.log(`  👤 Nombre: ${data.name}`)
  console.log(`  🎭 Rol: ${data.role || "user"}`)
  console.log(`  📅 Creado: ${data.createdAt}`)
  console.log(`  🖼️  Avatar: ${data.avatarUrl ? "Sí" : "No"}`)

  // Check if admin
  if (data.role === "super_admin") {
    console.log("\n🔐 ⭐ Este usuario ES ADMINISTRADOR (super_admin)")
  } else {
    console.log(`\n⚠️  Este usuario NO es administrador (rol: ${data.role || "user"})`)
  }

  process.exit(0)
} catch (error) {
  console.error("❌ Error al consultar Firebase:", error.message)
  process.exit(1)
} finally {
  // Close Firebase connection
  await db.terminate?.()
}
