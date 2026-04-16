import { Router } from "express"
import rateLimit from "express-rate-limit"
import { loginUser, registerUser, getMe, updateMe, forgotPassword, resetPassword, verifyEmail } from "../controllers/auth.controller.js"
import { authMiddleware } from "../middlewares/middleware.auth.js"

const router = Router()

// Strict rate limiter for password reset requests: max 5 per 15 min per IP.
// Prevents abuse and email spam. Returns 429 when exceeded.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: "Demasiados intentos de recuperación. Espera 15 minutos antes de intentarlo de nuevo."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
})

// Moderate limiter for reset-password: 10 per 15 min per IP.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Demasiados intentos de restablecimiento. Espera 15 minutos antes de intentarlo de nuevo."
  },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post("/register", registerUser)
router.post("/login", loginUser)
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword)
router.post("/reset-password", resetPasswordLimiter, resetPassword)
router.post("/verify-email", verifyEmail)
router.get("/me", authMiddleware, getMe)
router.patch("/me", authMiddleware, updateMe)

export default router
