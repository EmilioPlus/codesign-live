import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import Routes from "./routes/rutas.js"
import AuthRoutes from "./routes/auth.routes.js"
import StreamsRoutes from "./routes/streams.routes.js"
import ForumsRoutes from "./routes/forums.routes.js"
import UploadRoutes from "./routes/upload.routes.js"
import ProjectsRoutes from "./routes/projects.routes.js"
import AdminRoutes from "./routes/admin.routes.js"
import StreamerRoutes from "./routes/streamer.routes.js"
import { errorHandler } from "./middlewares/middleware.error.js"
import { notFound } from "./middlewares/middleware.notFound.js"
import resend from "./config/email.js"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// dotenv.config() is now called in index.js BEFORE importing this module

const app = express()

// ✅ CORS PRIMERO, antes de todo
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Allow all vercel.app subdomains for preview deployments
    if (origin.endsWith(".vercel.app")) return callback(null, true)
    callback(new Error(`CORS not allowed for origin: ${origin}`))
  },
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
app.use("/api/admin", AdminRoutes)
app.use("/api/streamer", StreamerRoutes)

// ── Email health check (diagnóstico en producción) ────────────────────────
app.get("/api/health/email", async (req, res) => {
  const resendKey = process.env.RESEND_API_KEY
  const clientUrl = process.env.CLIENT_URL
  const frontendUrl = process.env.FRONTEND_URL

  const status = {
    provider: "Resend",
    emailConfigured: !!resendKey,
    apiKeyPrefix: resendKey ? `${resendKey.slice(0, 6)}...` : null,
    clientReady: resend !== null,
    clientUrl: clientUrl || null,
    frontendUrl: frontendUrl || null,
  }

  const ok = status.emailConfigured && status.clientReady
  res.status(ok ? 200 : 503).json({ ok, ...status })
})

// Serve local uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

app.use(notFound)
app.use(errorHandler)

export default app