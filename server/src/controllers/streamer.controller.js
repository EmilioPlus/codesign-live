import db from "../config/firebase.js"

const USERS_COLLECTION = "users"

// ── FOLLOW ──────────────────────────────────────────────────────────────────
// POST /api/streamer/:streamerId/follow
// Toggle follow: si ya sigue → deja de seguir; si no → sigue
export const toggleFollow = async (req, res, next) => {
  try {
    const { streamerId } = req.params
    const viewerId = req.user.id

    if (viewerId === streamerId) {
      return res.status(400).json({ message: "No puedes seguirte a ti mismo" })
    }

    const streamerRef = db.collection(USERS_COLLECTION).doc(streamerId)
    const streamerDoc = await streamerRef.get()
    if (!streamerDoc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    const followersRef = db
      .collection(USERS_COLLECTION)
      .doc(streamerId)
      .collection("followers")
      .doc(viewerId)

    const alreadyFollowing = await followersRef.get()

    if (alreadyFollowing.exists) {
      // Unfollow
      await followersRef.delete()

      const currentCount = streamerDoc.data().followerCount ?? 0
      await streamerRef.update({ followerCount: Math.max(0, currentCount - 1) })

      return res.json({ following: false, followerCount: Math.max(0, currentCount - 1) })
    } else {
      // Follow
      await followersRef.set({
        followedAt: new Date().toISOString(),
        viewerId,
        viewerName: req.user.name,
      })

      const currentCount = streamerDoc.data().followerCount ?? 0
      await streamerRef.update({ followerCount: currentCount + 1 })

      return res.json({ following: true, followerCount: currentCount + 1 })
    }
  } catch (error) {
    return next(error)
  }
}

// GET /api/streamer/:streamerId/follow-status
// Devuelve si el viewer actual sigue al streamer
export const getFollowStatus = async (req, res, next) => {
  try {
    const { streamerId } = req.params
    const viewerId = req.user.id

    const followersRef = db
      .collection(USERS_COLLECTION)
      .doc(streamerId)
      .collection("followers")
      .doc(viewerId)

    const doc = await followersRef.get()

    const streamerDoc = await db.collection(USERS_COLLECTION).doc(streamerId).get()
    const followerCount = streamerDoc.exists ? (streamerDoc.data().followerCount ?? 0) : 0

    return res.json({ following: doc.exists, followerCount })
  } catch (error) {
    return next(error)
  }
}

// ── SUBSCRIBE ────────────────────────────────────────────────────────────────
// POST /api/streamer/:streamerId/subscribe
// Suscripción al canal del streamer (gratuita en la plataforma)
export const subscribeToStreamer = async (req, res, next) => {
  try {
    const { streamerId } = req.params
    const viewerId = req.user.id

    if (viewerId === streamerId) {
      return res.status(400).json({ message: "No puedes suscribirte a tu propia cuenta" })
    }

    const streamerRef = db.collection(USERS_COLLECTION).doc(streamerId)
    const streamerDoc = await streamerRef.get()
    if (!streamerDoc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    const subsRef = db
      .collection(USERS_COLLECTION)
      .doc(streamerId)
      .collection("subscribers")
      .doc(viewerId)

    const alreadySubbed = await subsRef.get()
    if (alreadySubbed.exists) {
      return res.status(409).json({ message: "Ya estás suscrito a este canal" })
    }

    await subsRef.set({
      subscribedAt: new Date().toISOString(),
      viewerId,
      viewerName: req.user.name,
      viewerAvatarUrl: req.user.avatarUrl || null,
      gifted: false,
      giftedBy: null,
    })

    const currentCount = streamerDoc.data().subscriberCount ?? 0
    await streamerRef.update({ subscriberCount: currentCount + 1 })

    return res.status(201).json({
      subscribed: true,
      subscriberCount: currentCount + 1,
    })
  } catch (error) {
    return next(error)
  }
}

// GET /api/streamer/:streamerId/subscribe-status
export const getSubscribeStatus = async (req, res, next) => {
  try {
    const { streamerId } = req.params
    const viewerId = req.user.id

    const subsRef = db
      .collection(USERS_COLLECTION)
      .doc(streamerId)
      .collection("subscribers")
      .doc(viewerId)

    const doc = await subsRef.get()
    const streamerDoc = await db.collection(USERS_COLLECTION).doc(streamerId).get()
    const subscriberCount = streamerDoc.exists ? (streamerDoc.data().subscriberCount ?? 0) : 0

    return res.json({ subscribed: doc.exists, subscriberCount, giftedData: doc.exists ? doc.data() : null })
  } catch (error) {
    return next(error)
  }
}

// ── GIFT SUB ─────────────────────────────────────────────────────────────────
// POST /api/streamer/:streamerId/gift-sub
// Regalar suscripción a un usuario específico (por nombre)
export const giftSubscription = async (req, res, next) => {
  try {
    const { streamerId } = req.params
    const gifterId = req.user.id
    const { recipientName } = req.body

    if (!recipientName || !String(recipientName).trim()) {
      return res.status(400).json({ message: "Debes especificar el nombre del usuario al que quieres regalar la suscripción" })
    }

    const recipientNameClean = String(recipientName).trim().toLowerCase()

    const streamerDoc = await db.collection(USERS_COLLECTION).doc(streamerId).get()
    if (!streamerDoc.exists) {
      return res.status(404).json({ message: "Streamer no encontrado" })
    }

    // Buscar receptor por nombre
    const recipientSnap = await db
      .collection(USERS_COLLECTION)
      .where("name", ">=", recipientNameClean)
      .where("name", "<=", recipientNameClean + "\uf8ff")
      .limit(5)
      .get()

    if (recipientSnap.empty) {
      return res.status(404).json({ message: `No se encontró ningún usuario con el nombre "${recipientName}"` })
    }

    // Devolver candidatos si hay más de 1  
    if (recipientSnap.docs.length > 1) {
      const candidates = recipientSnap.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        avatarUrl: d.data().avatarUrl || null,
      }))
      return res.status(300).json({ candidates, message: "Se encontraron varios usuarios, elige uno" })
    }

    const recipientDoc = recipientSnap.docs[0]
    const recipientId = recipientDoc.id

    if (recipientId === gifterId) {
      return res.status(400).json({ message: "No puedes regalarte una suscripción a ti mismo" })
    }
    if (recipientId === streamerId) {
      return res.status(400).json({ message: "No puedes regalarle una suscripción al propio streamer" })
    }

    const subsRef = db
      .collection(USERS_COLLECTION)
      .doc(streamerId)
      .collection("subscribers")
      .doc(recipientId)

    const alreadySubbed = await subsRef.get()
    if (alreadySubbed.exists && !alreadySubbed.data().gifted) {
      return res.status(409).json({ message: `${recipientDoc.data().name} ya está suscrito a este canal` })
    }

    await subsRef.set({
      subscribedAt: new Date().toISOString(),
      viewerId: recipientId,
      viewerName: recipientDoc.data().name,
      viewerAvatarUrl: recipientDoc.data().avatarUrl || null,
      gifted: true,
      giftedBy: gifterId,
      giftedByName: req.user.name,
    })

    const currentCount = streamerDoc.data().subscriberCount ?? 0
    await db.collection(USERS_COLLECTION).doc(streamerId).update({ subscriberCount: currentCount + 1 })

    return res.status(201).json({
      gifted: true,
      recipient: {
        id: recipientId,
        name: recipientDoc.data().name,
        avatarUrl: recipientDoc.data().avatarUrl || null,
      },
      subscriberCount: currentCount + 1,
    })
  } catch (error) {
    return next(error)
  }
}

// GET /api/streamer/:streamerId/search-users?q=nombre
// Buscar usuarios para autorcompletar en el regalo de sub
export const searchUsersForGift = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase()
    if (q.length < 2) {
      return res.json({ users: [] })
    }

    const snap = await db
      .collection(USERS_COLLECTION)
      .where("name", ">=", q)
      .where("name", "<=", q + "\uf8ff")
      .limit(8)
      .get()

    const users = snap.docs.map(d => ({
      id: d.id,
      name: d.data().name,
      avatarUrl: d.data().avatarUrl || null,
    }))

    return res.json({ users })
  } catch (error) {
    return next(error)
  }
}

// GET /api/streamer/:streamerId/profile
// Perfi completo del streamer (seguidores, suscriptores, metas, descripción)
export const getStreamerProfile = async (req, res, next) => {
  try {
    const { streamerId } = req.params

    const userDoc = await db.collection(USERS_COLLECTION).doc(streamerId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Streamer no encontrado" })
    }

    const d = userDoc.data()
    return res.json({
      id: userDoc.id,
      name: d.name,
      avatarUrl: d.avatarUrl || null,
      followerCount: d.followerCount ?? 0,
      subscriberCount: d.subscriberCount ?? 0,
      bio: d.bio || "",
      goals: d.goals || [],
    })
  } catch (error) {
    return next(error)
  }
}

// PUT /api/streamer/profile
// El propio transmisor edita su bio y metas
export const updateStreamerProfile = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { bio, goals } = req.body

    const updates = {}
    if (bio !== undefined) updates.bio = String(bio).slice(0, 500)
    if (goals !== undefined && Array.isArray(goals)) {
      // Validar estructura de metas: [{title, current, target}]
      updates.goals = goals.slice(0, 5).map(g => ({
        title: String(g.title || "").slice(0, 100),
        current: Number(g.current) || 0,
        target: Number(g.target) || 1,
        icon: g.icon || "star",
      }))
    }

    await db.collection(USERS_COLLECTION).doc(userId).update(updates)

    return res.json({ message: "Perfil actualizado", ...updates })
  } catch (error) {
    return next(error)
  }
}
