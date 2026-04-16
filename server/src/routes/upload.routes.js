import express from "express"
import multer from "multer"
import path from "path"
import { bucket } from "../config/firebase.js"
import { authMiddleware } from "../middlewares/middleware.auth.js"

const router = express.Router()

const storage = multer.memoryStorage()

// Valid file extensions and their corresponding MIME types
const VALID_EXTENSIONS = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json"
}

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  const mimeType = file.mimetype

  // Both extension and MIME type must match
  if (VALID_EXTENSIONS[ext] && VALID_EXTENSIONS[ext] === mimeType) {
    cb(null, true)
  } else {
    cb(new Error("Formato inválido. Solo se admiten imágenes (.jpg, .png, .webp) y modelos 3D (.glb, .gltf)."))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter
})

router.post("/", authMiddleware, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    next()
  })
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se subió ningún archivo" })
  }

  try {
    // Sanitize filename - remove potentially dangerous characters
    const originalName = req.file.originalname
    const safeExt = path.extname(originalName).toLowerCase()

    // Validate extension is in our allowed list
    if (!VALID_EXTENSIONS[safeExt]) {
      return res.status(400).json({ error: "Extensión de archivo no permitida" })
    }

    // Generate unique, safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const fileName = `projects/${uniqueSuffix}${safeExt}`

    const file = bucket.file(fileName)

    // Save buffer to bucket with the validated MIME type
    await file.save(req.file.buffer, {
      metadata: {
        contentType: VALID_EXTENSIONS[safeExt],
      }
    })

    // Construct public download URL
    const encodedFileName = encodeURIComponent(fileName)
    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFileName}?alt=media`

    res.json({ message: "Archivo subido exitosamente a Firebase Storage", fileUrl })
  } catch (error) {
    console.error("Error al subir a Firebase Storage:", error)
    res.status(500).json({ error: "No se pudo subir el archivo" })
  }
})

export default router