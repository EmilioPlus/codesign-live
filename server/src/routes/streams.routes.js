import { Router } from "express"
import { authMiddleware } from "../middlewares/middleware.auth.js"
import { createStream, endStream, getStream, listStreams } from "../controllers/streams.controller.js"

const router = Router()

router.get("/", listStreams)
router.get("/:id", getStream)
router.post("/", authMiddleware, createStream)
router.patch("/:id/end", authMiddleware, endStream)

export default router
