import db from "../config/firebase.js"

const FORUMS_COLLECTION = "forums"
const FORUM_VOTES_COLLECTION = "forum_votes"
const FORUM_POSTS_COLLECTION = "forum_posts"
const STREAMS_COLLECTION = "streams"
const DURATION_MS = 30 * 60 * 1000 // 30 min

function serializeForum(doc) {
  if (!doc.exists) return null
  const d = doc.data()
  return {
    id: doc.id,
    streamId: d.streamId,
    createdBy: d.createdBy,
    title: d.title || "",
    description: d.description || "",
    type: d.type || "poll",
    options: d.options || [],
    createdAt: d.createdAt,
    expiresAt: d.expiresAt,
    status: d.status || "active",
  }
}

async function ensureForumNotExpired(forumRef) {
  const doc = await forumRef.get()
  if (!doc.exists) return null
  const d = doc.data()
  const expiresAt = d.expiresAt ? new Date(d.expiresAt).getTime() : 0
  if (Date.now() >= expiresAt && d.status === "active") {
    await forumRef.update({ status: "closed" })
    return null
  }
  return doc
}

export const createForum = async (req, res, next) => {
  try {
    const { streamId } = req.params
    const { title, description, type, options } = req.body
    const userId = req.user.id

    const streamDoc = await db.collection(STREAMS_COLLECTION).doc(streamId).get()
    if (!streamDoc.exists) {
      return res.status(404).json({ message: "Transmisión no encontrada" })
    }
    if (streamDoc.data().userId !== userId) {
      return res.status(403).json({ message: "Solo el transmisor puede crear foros en esta transmisión" })
    }
    if (streamDoc.data().status !== "live") {
      return res.status(400).json({ message: "Solo se pueden crear foros en transmisiones en vivo" })
    }

    const titleText = title && String(title).trim() ? title.trim() : "Foro"
    const descriptionText = description && String(description).trim() ? description.trim() : ""
    const forumType = type === "discussion" ? "discussion" : "poll"
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + DURATION_MS).toISOString()

    const existingActive = await db
      .collection(FORUMS_COLLECTION)
      .where("streamId", "==", streamId)
      .where("status", "==", "active")
      .get()
    for (const d of existingActive.docs) {
      await d.ref.update({ status: "closed" })
    }

    let optionsList = []
    if (forumType === "poll" && Array.isArray(options)) {
      optionsList = options
        .map((t, i) => ({ id: String(i), text: String(t).trim() }))
        .filter((o) => o.text)
    }
    if (forumType === "poll" && optionsList.length < 2) {
      return res.status(400).json({ message: "La encuesta debe tener al menos 2 opciones" })
    }

    const forumRef = await db.collection(FORUMS_COLLECTION).add({
      streamId,
      createdBy: userId,
      title: titleText,
      description: descriptionText,
      type: forumType,
      options: optionsList,
      createdAt: now,
      expiresAt,
      status: "active",
    })

    const forum = {
      id: forumRef.id,
      streamId,
      createdBy: userId,
      title: titleText,
      description: descriptionText,
      type: forumType,
      options: optionsList,
      createdAt: now,
      expiresAt,
      status: "active",
    }

    return res.status(201).json({ forum })
  } catch (error) {
    return next(error)
  }
}

export const getActiveForum = async (req, res, next) => {
  try {
    const { streamId } = req.params

    const snap = await db
      .collection(FORUMS_COLLECTION)
      .where("streamId", "==", streamId)
      .where("status", "==", "active")
      .limit(1)
      .get()

    if (snap.empty) {
      return res.json({ forum: null })
    }

    const doc = snap.docs[0]
    const forumRef = db.collection(FORUMS_COLLECTION).doc(doc.id)
    const updated = await ensureForumNotExpired(forumRef)
    if (!updated) {
      return res.json({ forum: null })
    }

    const forum = serializeForum(updated)
    if (forum.status !== "active") return res.json({ forum: null })
    return res.json({ forum })
  } catch (error) {
    return next(error)
  }
}

export const voteForum = async (req, res, next) => {
  try {
    const { forumId } = req.params
    const { optionId } = req.body
    const userId = req.user.id

    const forumRef = db.collection(FORUMS_COLLECTION).doc(forumId)
    const doc = await ensureForumNotExpired(forumRef)
    if (!doc) {
      return res.status(404).json({ message: "Foro no encontrado o ya cerrado" })
    }
    const data = doc.data()
    if (data.status !== "active") {
      return res.status(400).json({ message: "El foro está cerrado" })
    }
    if (data.type !== "poll") {
      return res.status(400).json({ message: "Este foro no es una encuesta" })
    }
    const validOption = data.options.some((o) => o.id === optionId)
    if (!validOption) {
      return res.status(400).json({ message: "Opción no válida" })
    }

    const existing = await db
      .collection(FORUM_VOTES_COLLECTION)
      .where("forumId", "==", forumId)
      .where("userId", "==", userId)
      .limit(1)
      .get()
    if (!existing.empty) {
      return res.status(400).json({ message: "Ya has votado en esta encuesta" })
    }

    await db.collection(FORUM_VOTES_COLLECTION).add({
      forumId,
      userId,
      optionId,
      createdAt: new Date().toISOString(),
    })

    return res.json({ message: "Voto registrado" })
  } catch (error) {
    return next(error)
  }
}

export const addForumPost = async (req, res, next) => {
  try {
    const { forumId } = req.params
    const { text } = req.body
    const userId = req.user.id
    const userName = req.user.name || "Anónimo"

    const forumRef = db.collection(FORUMS_COLLECTION).doc(forumId)
    const doc = await ensureForumNotExpired(forumRef)
    if (!doc) {
      return res.status(404).json({ message: "Foro no encontrado o ya cerrado" })
    }
    const data = doc.data()
    if (data.status !== "active") {
      return res.status(400).json({ message: "El foro está cerrado" })
    }
    if (data.type !== "discussion") {
      return res.status(400).json({ message: "Este foro no acepta comentarios" })
    }

    const textTrim = text && String(text).trim() ? text.trim().slice(0, 1000) : ""
    if (!textTrim) {
      return res.status(400).json({ message: "El mensaje no puede estar vacío" })
    }

    await db.collection(FORUM_POSTS_COLLECTION).add({
      forumId,
      userId,
      userName,
      text: textTrim,
      createdAt: new Date().toISOString(),
    })

    return res.status(201).json({ message: "Comentario publicado" })
  } catch (error) {
    return next(error)
  }
}

export const getForumResults = async (req, res, next) => {
  try {
    const { forumId } = req.params
    const userId = req.user.id

    const forumDoc = await db.collection(FORUMS_COLLECTION).doc(forumId).get()
    if (!forumDoc.exists) {
      return res.status(404).json({ message: "Foro no encontrado" })
    }
    const forumData = forumDoc.data()
    const streamDoc = await db.collection(STREAMS_COLLECTION).doc(forumData.streamId).get()
    if (!streamDoc.exists || streamDoc.data().userId !== userId) {
      return res.status(403).json({ message: "Solo el transmisor puede ver los resultados" })
    }

    const forum = serializeForum(forumDoc)

    if (forum.type === "poll") {
      const votesSnap = await db
        .collection(FORUM_VOTES_COLLECTION)
        .where("forumId", "==", forumId)
        .get()
      const countByOption = {}
      forum.options.forEach((o) => {
        countByOption[o.id] = { optionId: o.id, text: o.text, count: 0 }
      })
      votesSnap.docs.forEach((d) => {
        const opt = d.data().optionId
        if (countByOption[opt]) countByOption[opt].count += 1
      })
      const results = Object.values(countByOption)
      const total = results.reduce((s, r) => s + r.count, 0)
      return res.json({
        forum: { ...forum, totalVotes: total },
        results,
      })
    }

    const postsSnap = await db
      .collection(FORUM_POSTS_COLLECTION)
      .where("forumId", "==", forumId)
      .get()
    const posts = postsSnap.docs
      .map((d) => {
      const x = d.data()
      return {
        id: d.id,
        userName: x.userName,
        text: x.text,
        createdAt: x.createdAt,
      }
    })
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
    return res.json({ forum, posts })
  } catch (error) {
    return next(error)
  }
}
