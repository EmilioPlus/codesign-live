import { Router } from "express"
import { authMiddleware } from "../middlewares/middleware.auth.js"
import {
  toggleFollow,
  getFollowStatus,
  subscribeToStreamer,
  getSubscribeStatus,
  giftSubscription,
  searchUsersForGift,
  getStreamerProfile,
  updateStreamerProfile,
} from "../controllers/streamer.controller.js"

const router = Router()

// Perfil del streamer (público)
router.get("/:streamerId/profile", authMiddleware, getStreamerProfile)

// Editar propio perfil (bio + metas)
router.put("/profile", authMiddleware, updateStreamerProfile)

// Follow / Unfollow
router.post("/:streamerId/follow", authMiddleware, toggleFollow)
router.get("/:streamerId/follow-status", authMiddleware, getFollowStatus)

// Suscripciones
router.post("/:streamerId/subscribe", authMiddleware, subscribeToStreamer)
router.get("/:streamerId/subscribe-status", authMiddleware, getSubscribeStatus)

// Regalo de suscripción + búsqueda de usuarios
router.post("/:streamerId/gift-sub", authMiddleware, giftSubscription)
router.get("/:streamerId/search-users", authMiddleware, searchUsersForGift)

export default router
