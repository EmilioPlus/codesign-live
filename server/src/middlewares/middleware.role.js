export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "No tienes los permisos necesarios para realizar esta acción" })
    }

    next()
  }
}
