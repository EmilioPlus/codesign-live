import express from "express"
import { getUserProjects, createProject, deleteProject } from "../controllers/projects.controller.js"

const router = express.Router()

router.get("/:userId", getUserProjects)
router.post("/", createProject)
router.delete("/:id", deleteProject)

export default router
