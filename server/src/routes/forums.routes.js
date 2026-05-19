import { Router } from "express"
import { authMiddleware } from "../middlewares/middleware.auth.js"
import { voteForum, addForumPost, getForumResults } from "../controllers/forums.controller.js"

const router = Router()

router.post("/:forumId/vote", authMiddleware, voteForum)
router.post("/:forumId/posts", authMiddleware, addForumPost)
router.get("/:forumId/results", authMiddleware, getForumResults)

export default router
