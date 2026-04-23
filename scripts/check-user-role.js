#!/usr/bin/env node
/**
 * Script para verificar el rol de un usuario en CoDesign LIVE
 * Uso: node check-user-role.js <email>
 */

import admin from "firebase-admin"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../server/.env") })

// Initialize Firebase
let serviceAccount
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} else {
  try {
    const { createRequire } = await import("module")
    const require = createRequire(import.meta.url)
    serviceAccount = require("../server/Firebasekey.json")
  } catch {
    console.error("❌ Error: Firebase credentials not found")
    console.error("Set FIREBASE_SERVICE_ACCOUNT env variable or ensure Firebasekey.json exists")
    process.exit(1)
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "codesign-live.firebasestorage.app"
})

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
}
