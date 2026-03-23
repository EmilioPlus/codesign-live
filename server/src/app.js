import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import Routes from "./routes/rutas.js"
import AuthRoutes from "./routes/auth.routes.js"
import StreamsRoutes from "./routes/streams.routes.js"
import ForumsRoutes from "./routes/forums.routes.js"
import UploadRoutes from "./routes/upload.routes.js"
import ProjectsRoutes from "./routes/projects.routes.js"
import { errorHandler } from "./middlewares/middleware.error.js"
import { notFound } from "./middlewares/middleware.notFound.js"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config() // ← esto ya está bien arriba

const app = express()

// ✅ CORS PRIMERO, antes de todo
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}))

// Seguridad: Cabeceras HTTP seguras
app.use(helmet({
  crossOriginResourcePolicy: false,
}))

// Seguridad: Limitar cantidad de peticiones (1000 por cada 15 min)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Demasiadas peticiones desde esta IP. Intenta de nuevo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api", apiLimiter)

app.use(express.json())

app.use("/api/rutas", Routes)
app.use("/api/auth", AuthRoutes)
app.use("/api/streams", StreamsRoutes)
app.use("/api/forums", ForumsRoutes)
app.use("/api/upload", UploadRoutes)
app.use("/api/projects", ProjectsRoutes)

// Serve local uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

app.use(notFound)
app.use(errorHandler)

export default app