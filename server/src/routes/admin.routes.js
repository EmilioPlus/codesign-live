import { Router } from "express"
import { authMiddleware } from "../middlewares/middleware.auth.js"
import { checkRole } from "../middlewares/middleware.role.js"
import { listUsers, updateUserRole } from "../controllers/admin.controller.js"

const router = Router()

// Proteger con Auth y validar que sea super_admin
router.use(authMiddleware, checkRole(["super_admin"]))

router.get("/users", listUsers)
router.patch("/users/:userId/role", updateUserRole)

export default router
