import db from "../../config/firebase.js"

const STREAMS_COLLECTION = "streams"

export const createStream = async (req, res, next) => {
  try {
    const { title } = req.body
    const userId = req.user.id
    const userName = req.user.name

    const titleText = title && String(title).trim() ? title.trim() : "Transmisión en vivo"

    const streamRef = await db.collection(STREAMS_COLLECTION).add({
      userId,
      userName,
      title: titleText,
      status: "live",
      viewerCount: 0,
      createdAt: new Date().toISOString(),
      endedAt: null,
    })

    const stream = {
      id: streamRef.id,
      userId,
      userName,
      title: titleText,
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

    const streams = snap.docs
      .map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        title: d.title || "Transmisión en vivo",
        user: d.userName,
        viewers: d.viewerCount ?? 0,
        live: d.status === "live",
        createdAt: d.createdAt,
      }
    })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

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
      title: d.title || "Transmisión en vivo",
      user: d.userName,
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

    return res.json({ message: "Transmisión finalizada correctamente" })
  } catch (error) {
    return next(error)
  }
}
