import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "codesign-live-secret-change-in-production"

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticación requerido" })
  }

  const token = authHeader.slice(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = { id: decoded.userId, name: decoded.name, email: decoded.email }
    next()
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" })
  }
}
