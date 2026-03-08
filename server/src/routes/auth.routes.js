import { Router } from "express"
import { loginUser, registerUser, getMe, updateMe } from "../controllers/auth.controller.js"
import { authMiddleware } from "../middlewares/middleware.auth.js"

const router = Router()

router.post("/register", registerUser)
router.post("/login", loginUser)
router.get("/me", authMiddleware, getMe)
router.patch("/me", authMiddleware, updateMe)

export default router

