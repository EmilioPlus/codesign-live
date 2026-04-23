import express from "express"
import { getUserProjects, createProject, deleteProject } from "../controllers/projects.controller.js"
import { authMiddleware } from "../middlewares/middleware.auth.js"

const router = express.Router()

// All project routes require authentication
router.get("/:userId", authMiddleware, getUserProjects)
router.post("/", authMiddleware, createProject)
router.delete("/:id", authMiddleware, deleteProject)

export default router