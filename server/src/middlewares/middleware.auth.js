import jwt from "jsonwebtoken"

// JWT_SECRET must be set in environment variables - NO DEFAULT for security
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is required")
  console.error("Set JWT_SECRET in your .env file or environment")
  process.exit(1)
}

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticación requerido" })
  }

  const token = authHeader.slice(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = {
      id: decoded.userId,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role || "user"
    }
    next()
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" })
  }
}

export { JWT_SECRET }