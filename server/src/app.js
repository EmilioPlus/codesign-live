import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import Routes from "./routes/rutas.js"
import { errorHandler } from "./middlewares/middleware.error.js"
import { notFound } from "./middlewares/middleware.notFound.js"

dotenv.config() // ← esto ya está bien arriba

const app = express()

// ✅ CORS PRIMERO, antes de todo
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}))

app.use(express.json())

app.use("/api/rutas", Routes)

app.use(notFound)
app.use(errorHandler)

export default app