#!/usr/bin/env node
/**
 * Script para listar todos los administradores (super_admin)
 * Uso: node list-admins.js
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

console.log("🔍 Listando todos los administradores (super_admin)...\n")

try {
  const snap = await db
    .collection(USERS_COLLECTION)
    .where("role", "==", "super_admin")
    .get()

  if (snap.empty) {
    console.log("⚠️  No hay administradores registrados en el sistema")
    process.exit(0)
  }

  console.log(`✅ Se encontraron ${snap.size} administrador(es):\n`)

  snap.forEach((doc, index) => {
    const data = doc.data()
    console.log(`${index + 1}. 👤 ${data.name}`)
    console.log(`   📧 ${data.email}`)
    console.log(`   🎭 Rol: ${data.role}`)
    console.log(`   📅 Creado: ${data.createdAt}`)
    console.log(`   🔑 ID: ${doc.id}\n`)
  })

  process.exit(0)
} catch (error) {
  console.error("❌ Error al consultar Firebase:", error.message)
  process.exit(1)
}
