import db from "../config/firebase.js"

const STREAMS_COLLECTION = "streams"
const USERS_COLLECTION = "users"

export const createStream = async (req, res, next) => {
  try {
    const { title, description, thumbnailUrl } = req.body
    const userId = req.user.id
    const userName = req.user.name

    const titleText = title && String(title).trim() ? title.trim() : "Transmisión en vivo"
    const descriptionText = description && String(description).trim() ? description.trim() : ""
    const thumbUrl = thumbnailUrl && String(thumbnailUrl).trim() ? thumbnailUrl.trim() : null

    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get()
    const userAvatarUrl = userDoc.exists ? (userDoc.data().avatarUrl || null) : null

    const existingLive = await db
      .collection(STREAMS_COLLECTION)
      .where("userId", "==", userId)
      .where("status", "==", "live")
      .limit(1)
      .get()

    if (!existingLive.empty) {
      const existing = existingLive.docs[0]
      const data = existing.data()
      const stream = {
        id: existing.id,
        userId: data.userId,
        userName: data.userName,
        userAvatarUrl: data.userAvatarUrl || null,
        title: data.title || "Transmisión en vivo",
        description: data.description || "",
        thumbnailUrl: data.thumbnailUrl || null,
        status: data.status,
        viewerCount: data.viewerCount ?? 0,
        createdAt: data.createdAt,
      }
      return res.status(200).json({ stream })
    }

    const streamRef = await db.collection(STREAMS_COLLECTION).add({
      userId,
      userName,
      userAvatarUrl,
      title: titleText,
      description: descriptionText,
      thumbnailUrl: thumbUrl,
      status: "live",
      viewerCount: 0,
      createdAt: new Date().toISOString(),
      endedAt: null,
    })

    const stream = {
      id: streamRef.id,
      userId,
      userName,
      userAvatarUrl,
      title: titleText,
      description: descriptionText,
      thumbnailUrl: thumbUrl,
      status: "live",
      viewerCount: 0,
      createdAt: new Date().toISOString(),
    }

    return res.status(201).json({ stream })
  } catch (error) {
    return next(error)
  }
}

export const listStreams = async (req, res, next) => {
  try {
    const snap = await db
      .collection(STREAMS_COLLECTION)
      .where("status", "==", "live")
      .get()

    const byUser = new Map()
    for (const doc of snap.docs) {
      const d = doc.data()
      const userId = d.userId
      const createdAt = d.createdAt || ""
      const entry = {
        id: doc.id,
        userId: d.userId,
        title: d.title || "Transmisión en vivo",
        description: d.description || "",
        thumbnailUrl: d.thumbnailUrl || null,
        user: d.userName,
        userAvatarUrl: d.userAvatarUrl || null,
        viewers: d.viewerCount ?? 0,
        live: d.status === "live",
        createdAt,
      }
      if (!byUser.has(userId) || (byUser.get(userId).createdAt || "").localeCompare(createdAt) < 0) {
        byUser.set(userId, entry)
      }
    }
    const streams = Array.from(byUser.values()).sort(
      (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")
    )

    return res.json({ streams })
  } catch (error) {
    return next(error)
  }
}

export const getStream = async (req, res, next) => {
  try {
    const { id } = req.params
    const doc = await db.collection(STREAMS_COLLECTION).doc(id).get()

    if (!doc.exists) {
      return res.status(404).json({ message: "Transmisión no encontrada" })
    }

    const d = doc.data()
    return res.json({
      id: doc.id,
      userId: d.userId,
      title: d.title || "Transmisión en vivo",
      description: d.description || "",
      thumbnailUrl: d.thumbnailUrl || null,
      user: d.userName,
      userAvatarUrl: d.userAvatarUrl || null,
      viewers: d.viewerCount ?? 0,
      live: d.status === "live",
    })
  } catch (error) {
    return next(error)
  }
}

export const endStream = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const docRef = db.collection(STREAMS_COLLECTION).doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return res.status(404).json({ message: "Transmisión no encontrada" })
    }

    const data = doc.data()
    if (data.userId !== userId) {
      return res.status(403).json({ message: "No tienes permiso para finalizar esta transmisión" })
    }

    if (data.status !== "live") {
      return res.status(400).json({ message: "La transmisión ya fue finalizada" })
    }

    await docRef.update({
      status: "ended",
      endedAt: new Date().toISOString(),
    })

    const otherLive = await db
      .collection(STREAMS_COLLECTION)
      .where("userId", "==", userId)
      .where("status", "==", "live")
      .get()
    const endedAt = new Date().toISOString()
    for (const d of otherLive.docs) {
      if (d.id !== id) await d.ref.update({ status: "ended", endedAt })
    }

    return res.json({ message: "Transmisión finalizada correctamente" })
  } catch (error) {
    return next(error)
  }
}

export const updateStreamMetadata = async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, description, thumbnailUrl } = req.body
    const userId = req.user.id

    const docRef = db.collection(STREAMS_COLLECTION).doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return res.status(404).json({ message: "Transmisión no encontrada" })
    }

    const data = doc.data()
    if (data.userId !== userId) {
      return res.status(403).json({ message: "No tienes permiso para editar esta transmisión" })
    }
    if (data.status !== "live") {
      return res.status(400).json({ message: "Solo se puede editar una transmisión en vivo" })
    }

    const updates = {}
    if (title !== undefined) updates.title = String(title).trim() || data.title
    if (description !== undefined) updates.description = String(description).trim()
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl ? String(thumbnailUrl).trim() : null

    await docRef.update(updates)
    const updated = await docRef.get()
    const d = updated.data()
    return res.json({
      id: updated.id,
      userId: d.userId,
      title: d.title,
      description: d.description || "",
      thumbnailUrl: d.thumbnailUrl || null,
      user: d.userName,
      userAvatarUrl: d.userAvatarUrl || null,
      viewers: d.viewerCount ?? 0,
      live: d.status === "live",
    })
  } catch (error) {
    return next(error)
  }
}
