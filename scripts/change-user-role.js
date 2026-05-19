#!/usr/bin/env node
/**
 * Script para cambiar el rol de un usuario
 * Uso: node change-user-role.js <email> <new_role>
 * Roles válidos: user, spectator, super_admin
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

// Get arguments from command line
const email = process.argv[2]?.toLowerCase().trim()
const newRole = process.argv[3]?.toLowerCase().trim()

if (!email || !newRole) {
  console.log("Usage: node change-user-role.js <email> <new_role>")
  console.log("Valid roles: user, spectator, super_admin")
  console.log("\nExample: node change-user-role.js jaiberhiguita4@gmail.com super_admin")
  process.exit(1)
}

const ALLOWED_ROLES = ["user", "spectator", "super_admin"]
if (!ALLOWED_ROLES.includes(newRole)) {
  console.error(`❌ Error: Rol inválido: ${newRole}`)
  console.error(`Roles permitidos: ${ALLOWED_ROLES.join(", ")}`)
  process.exit(1)
}

console.log(`🔄 Cambiando rol de ${email} a ${newRole}...\n`)

try {
  const snap = await db
    .collection(USERS_COLLECTION)
    .where("email", "==", email)
    .limit(1)
    .get()

  if (snap.empty) {
    console.log(`❌ Error: Usuario NO encontrado: ${email}`)
    process.exit(1)
  }

  const doc = snap.docs[0]
  const data = doc.data()
  const oldRole = data.role || "user"

  // Update role
  await doc.ref.update({
    role: newRole,
    updatedAt: new Date().toISOString()
  })

  console.log("✅ Rol actualizado exitosamente:\n")
  console.log(`  📧 Email: ${data.email}`)
  console.log(`  👤 Nombre: ${data.name}`)
  console.log(`  🎭 Rol anterior: ${oldRole}`)
  console.log(`  🎭 Rol nuevo: ${newRole}`)
  console.log(`  ⏰ Actualizado: ${new Date().toISOString()}\n`)

  if (newRole === "super_admin") {
    console.log("⭐ Este usuario ahora es ADMINISTRADOR\n")
  }

  process.exit(0)
} catch (error) {
  console.error("❌ Error al actualizar Firebase:", error.message)
  process.exit(1)
}
