import http from "http"
import { WebSocketServer } from "ws"
import app from "./app.js"
import db from "./config/firebase.js"

const PORT = process.env.PORT || 4000
const STREAMS_COLLECTION = "streams"

const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: "/ws" })

const clients = new Map()
const streams = new Map()

function createClientId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

wss.on("connection", (ws) => {
  const clientId = createClientId()
  const client = { id: clientId, ws, role: null, streamId: null }
  clients.set(clientId, client)

  ws.on("message", (data) => {
    let msg
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }

    if (msg.type === "join" && msg.streamId && msg.role) {
      client.role = msg.role
      client.streamId = msg.streamId

      let streamInfo = streams.get(msg.streamId)
      if (!streamInfo) {
        streamInfo = { broadcasterId: null, viewers: new Set() }
        streams.set(msg.streamId, streamInfo)
      }

      if (msg.role === "broadcaster") {
        streamInfo.broadcasterId = clientId
      } else if (msg.role === "viewer") {
        streamInfo.viewers.add(clientId)
        if (streamInfo.broadcasterId) {
          const broadcaster = clients.get(streamInfo.broadcasterId)
          if (broadcaster) {
            broadcaster.ws.send(
              JSON.stringify({
                type: "viewer-joined",
                streamId: msg.streamId,
                viewerId: clientId,
              })
            )
          }
        }
      }

      ws.send(
        JSON.stringify({
          type: "joined",
          clientId,
          streamId: msg.streamId,
          role: msg.role,
        })
      )
      return
    }

    if (msg.type === "offer" || msg.type === "answer" || msg.type === "ice-candidate") {
      const targetId = msg.targetId
      if (!targetId) return
      const target = clients.get(targetId)
      if (!target) return
      target.ws.send(
        JSON.stringify({
          ...msg,
          fromId: clientId,
        })
      )
      return
    }

    if (msg.type === "chat" && msg.streamId && typeof msg.text === "string") {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const payload = JSON.stringify({
        type: "chat-message",
        streamId: msg.streamId,
        text: msg.text.slice(0, 2000),
        userName: msg.userName || "Anónimo",
        clientId,
        timestamp: Date.now(),
      })
      streamInfo.viewers.forEach((viewerId) => {
        const viewer = clients.get(viewerId)
        if (viewer) viewer.ws.send(payload)
      })
      if (streamInfo.broadcasterId) {
        const broadcaster = clients.get(streamInfo.broadcasterId)
        if (broadcaster) broadcaster.ws.send(payload)
      }
      return
    }

    if (msg.type === "forum-created" && msg.streamId && msg.forum) {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const payload = JSON.stringify({ type: "forum-created", streamId: msg.streamId, forum: msg.forum })
      streamInfo.viewers.forEach((viewerId) => {
        const viewer = clients.get(viewerId)
        if (viewer) viewer.ws.send(payload)
      })
      if (streamInfo.broadcasterId) {
        const broadcaster = clients.get(streamInfo.broadcasterId)
        if (broadcaster) broadcaster.ws.send(payload)
      }
      return
    }

    if (msg.type === "forum-update" && msg.streamId && msg.forumId) {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const payload = JSON.stringify({ type: "forum-update", streamId: msg.streamId, forumId: msg.forumId })
      streamInfo.viewers.forEach((viewerId) => {
        const viewer = clients.get(viewerId)
        if (viewer) viewer.ws.send(payload)
      })
      if (streamInfo.broadcasterId) {
        const broadcaster = clients.get(streamInfo.broadcasterId)
        if (broadcaster) broadcaster.ws.send(payload)
      }
      return
    }
  })

  ws.on("close", () => {
    clients.delete(clientId)
    if (client.streamId) {
      const streamInfo = streams.get(client.streamId)
      if (client.role === "broadcaster") {
        const streamId = client.streamId
        if (streamInfo) {
          streamInfo.viewers.forEach((viewerId) => {
            const viewer = clients.get(viewerId)
            if (viewer) {
              viewer.ws.send(
                JSON.stringify({ type: "stream-ended", streamId })
              )
            }
          })
          streams.delete(streamId)
        }
        db.collection(STREAMS_COLLECTION)
          .doc(streamId)
          .update({
            status: "ended",
            endedAt: new Date().toISOString(),
          })
          .catch(() => {})
      } else if (streamInfo) {
        streamInfo.viewers.delete(clientId)
      }
    }
  })
})

async function closeOrphanedLiveStreams() {
  try {
    const snap = await db
      .collection(STREAMS_COLLECTION)
      .where("status", "==", "live")
      .get()
    const endedAt = new Date().toISOString()
    for (const doc of snap.docs) {
      await doc.ref.update({ status: "ended", endedAt })
    }
    if (!snap.empty) {
      console.log(`[streams] Cerradas ${snap.size} transmisión(es) en vivo al iniciar (sin transmisor conectado)`)
    }
  } catch (err) {
    console.warn("[streams] No se pudieron cerrar transmisiones huérfanas:", err.message)
  }
}

closeOrphanedLiveStreams().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
})