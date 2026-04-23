import { Router } from "express"
import { authMiddleware } from "../middlewares/middleware.auth.js"
import { createStream, endStream, getStream, listStreams, updateStreamMetadata } from "../controllers/streams.controller.js"
import { createForum, getActiveForum } from "../controllers/forums.controller.js"

const router = Router()

router.get("/", listStreams)
router.get("/:streamId/forums/active", getActiveForum)
router.post("/:streamId/forums", authMiddleware, createForum)
router.get("/:id", getStream)
router.post("/", authMiddleware, createStream)
router.patch("/:id/end", authMiddleware, endStream)
router.patch("/:id", authMiddleware, updateStreamMetadata)

export default router
