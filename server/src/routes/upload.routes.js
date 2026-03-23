import express from "express"
import multer from "multer"
import path from "path"
import { bucket } from "../config/firebase.js"

const router = express.Router()

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "model/gltf-binary",
    "model/gltf+json",
    "application/octet-stream"
  ]
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".glb", ".gltf"]
  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedExts.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Formato inválido. Solo se admiten imágenes (.jpg,.png,.webp) y modelos 3D (.glb,.gltf)."))
  }
}

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter 
})

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    next()
  })
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se subió ningún archivo" })
  }
  
  try {
    const originalName = req.file.originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(originalName)
    const fileName = `projects/${uniqueSuffix}${ext}`
    
    const file = bucket.file(fileName)
    
    // Save buffer to bucket
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
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
