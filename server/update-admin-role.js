import admin from "firebase-admin"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, ".env") })

let serviceAccount
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} else {
  serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, "Firebasekey.json"), "utf8"))
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "codesign-live.firebasestorage.app"
  })
} catch (e) {
  // Already initialized
}

const db = admin.firestore()

async function updateAdminRole() {
  const email = "jaiberhiguita4@gmail.com"
  console.log(`🔄 Actualizando rol de ${email} a super_admin...\n`)
  
  try {
    const snap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get()

    if (snap.empty) {
      console.log(`❌ Usuario no encontrado: ${email}`)
      process.exit(1)
    }

    const doc = snap.docs[0]
    const oldRole = doc.data().role

    await doc.ref.update({
      role: "super_admin",
      updatedAt: new Date().toISOString()
    })

    console.log("✅ Rol actualizado exitosamente:\n")
    console.log(`  📧 Email: ${email}`)
    console.log(`  🎭 Rol anterior: ${oldRole}`)
    console.log(`  🎭 Rol nuevo: super_admin`)
    console.log(`  ⏰ Actualizado: ${new Date().toISOString()}\n`)
    console.log("⭐ Este usuario ahora es administrador del sistema\n")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  } finally {
    await db.terminate?.()
  }
}

updateAdminRole()
