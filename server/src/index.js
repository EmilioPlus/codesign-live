// Load environment variables FIRST before anything else
import "./config/env.js"

import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables FIRST before importing anything else
dotenv.config({ path: path.join(__dirname, "../.env") })

import http from "http"
import { WebSocketServer } from "ws"
import app from "./app.js"
import db from "./config/firebase.js"
import { cleanupExpiredTokens } from "./services/token/reset-token.service.js"
import { cleanupExpiredVerificationTokens } from "./services/token/verification-token.service.js"

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
  ws.isAlive = true
  ws.on("pong", () => {
    ws.isAlive = true
  })

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
      client.userName = msg.userName || "Anónimo"

      let streamInfo = streams.get(msg.streamId)
      if (!streamInfo) {
        streamInfo = { broadcasterId: null, viewers: new Set(), chatHistory: [] }
        streams.set(msg.streamId, streamInfo)
      }

      if (msg.role === "broadcaster") {
        streamInfo.broadcasterId = clientId
      } else if (msg.role === "viewer") {
        streamInfo.viewers.add(clientId)
        // Solo contar los viewers activos en el mapa clients
        const count = Array.from(streamInfo.viewers).filter(v => clients.has(v)).length
        db.collection(STREAMS_COLLECTION).doc(msg.streamId).update({ viewerCount: count }).catch(() => {})

        const payloadCount = JSON.stringify({ type: "viewer-count", count, streamId: msg.streamId })
        streamInfo.viewers.forEach(v => {
          const viewerClient = clients.get(v)
          if (viewerClient) viewerClient.ws.send(payloadCount)
        })

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
            broadcaster.ws.send(payloadCount)
          }
        }
      }

      ws.send(JSON.stringify({ type: "viewer-count", count: streamInfo.viewers.size, streamId: msg.streamId }))
      ws.send(
        JSON.stringify({
          type: "joined",
          clientId,
          streamId: msg.streamId,
          role: msg.role,
        })
      )

      if (streamInfo.chatHistory && streamInfo.chatHistory.length > 0) {
        ws.send(JSON.stringify({
          type: "chat-history",
          streamId: msg.streamId,
          messages: streamInfo.chatHistory
        }))
      }
      return
    }

    const routeTypes = [
      "offer", "answer", "ice-candidate", 
      "invite-exclusive", "exclusive-offer", "exclusive-answer", 
      "exclusive-ice-candidate", "revoke-exclusive", "exclusive-status",
      "pointer-move", "pointer-permission"
    ]
    if (routeTypes.includes(msg.type)) {
      let targetId = msg.targetId
      // Fallback: Si se recibe targetName, buscar en la sala al usuario activo que coincida
      if (msg.targetName && msg.streamId) {
        const streamInfo = streams.get(msg.streamId)
        if (streamInfo) {
          const activeViewerId = Array.from(streamInfo.viewers).find(vId => {
            const v = clients.get(vId)
            return v && v.userName === msg.targetName
          })
          if (activeViewerId) {
            targetId = activeViewerId
          }
        }
      }
      if (!targetId) return
      const target = clients.get(targetId)
      if (!target) return
      target.ws.send(
        JSON.stringify({
          ...msg,
          targetId,
          fromId: clientId,
        })
      )
      return
    }

    // Camera toggle — broadcaster notifies all viewers
    if (msg.type === "camera-toggle" && msg.streamId) {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const payload = JSON.stringify({
        type: "camera-toggle",
        streamId: msg.streamId,
        cameraOn: msg.cameraOn,
        cameraStreamId: msg.cameraStreamId,
        screenStreamId: msg.screenStreamId,
      })
      streamInfo.viewers.forEach(viewerId => {
        const viewer = clients.get(viewerId)
        if (viewer) viewer.ws.send(payload)
      })
      return
    }

    // File message — exclusive user shares a file, broadcast to all
    if (msg.type === "file-message" && msg.streamId && msg.fileUrl) {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const msgId = msg.msgId || `srv-file-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const fileMsg = {
        type: "file-message",
        streamId: msg.streamId,
        fileUrl: msg.fileUrl,
        fileName: msg.fileName || "archivo",
        fileType: msg.fileType || "application/octet-stream",
        userName: msg.userName || "Anónimo",
        clientId,
        timestamp: Date.now(),
        msgId,
      }
      const payload = JSON.stringify(fileMsg)
      if (!streamInfo.chatHistory) streamInfo.chatHistory = []
      streamInfo.chatHistory.push(fileMsg)
      if (streamInfo.chatHistory.length > 300) streamInfo.chatHistory.shift()
      streamInfo.viewers.forEach(viewerId => {
        const viewer = clients.get(viewerId)
        if (viewer) viewer.ws.send(payload)
      })
      if (streamInfo.broadcasterId) {
        const broadcaster = clients.get(streamInfo.broadcasterId)
        if (broadcaster) broadcaster.ws.send(payload)
      }
      return
    }

    // Levantar / bajar la mano — reenviar al broadcaster
    if ((msg.type === "raise-hand" || msg.type === "lower-hand") && msg.streamId) {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo || !streamInfo.broadcasterId) return
      const broadcaster = clients.get(streamInfo.broadcasterId)
      if (broadcaster) {
        broadcaster.ws.send(JSON.stringify({ ...msg, fromId: clientId }))
      }
      return
    }

    // Broadcast: exclusive-active y exclusive-ended → todos los viewers
    if ((msg.type === "exclusive-active" || msg.type === "exclusive-ended") && msg.streamId) {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const payload = JSON.stringify({ ...msg, fromId: clientId })
      streamInfo.viewers.forEach(viewerId => {
        const viewer = clients.get(viewerId)
        if (viewer) viewer.ws.send(payload)
      })
      return
    }

    // Reacciones emoji — broadcast a todos (viewers + broadcaster)
    if (msg.type === "reaction" && msg.streamId && msg.emoji) {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const payload = JSON.stringify({
        type: "reaction",
        streamId: msg.streamId,
        emoji: msg.emoji,
        userName: msg.userName || "Anónimo",
        clientId,
      })
      streamInfo.viewers.forEach(viewerId => {
        const viewer = clients.get(viewerId)
        if (viewer) viewer.ws.send(payload)
      })
      if (streamInfo.broadcasterId) {
        const broadcaster = clients.get(streamInfo.broadcasterId)
        if (broadcaster) broadcaster.ws.send(payload)
      }
      return
    }

    if (msg.type === "chat" && msg.streamId && typeof msg.text === "string") {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const msgId = msg.msgId || `srv-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const chatMsg = {
        type: "chat-message",
        streamId: msg.streamId,
        text: msg.text.slice(0, 2000),
        userName: msg.userName || "Anónimo",
        clientId,
        timestamp: Date.now(),
        msgId,
      }
      const payload = JSON.stringify(chatMsg)

      if (!streamInfo.chatHistory) streamInfo.chatHistory = []
      streamInfo.chatHistory.push(chatMsg)
      if (streamInfo.chatHistory.length > 300) {
        streamInfo.chatHistory.shift()
      }
      // Broadcast to all viewers, including the sender. Client dedupes by msgId.
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
    if ((msg.type === "draw-stroke" || msg.type === "clear-canvas") && msg.streamId) {
      if (client.streamId !== msg.streamId) return
      const streamInfo = streams.get(msg.streamId)
      if (!streamInfo) return
      const payload = JSON.stringify(msg)
      streamInfo.viewers.forEach((viewerId) => {
        const viewer = clients.get(viewerId)
        if (viewer && viewerId !== clientId) viewer.ws.send(payload)
      })
      if (streamInfo.broadcasterId && streamInfo.broadcasterId !== clientId) {
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
            viewerCount: 0, // Reiniciar contador a 0 al finalizar la transmisión
          })
          .catch(() => {})
      } else if (streamInfo) {
        streamInfo.viewers.delete(clientId)
        if (client.role === "viewer") {
          // Solo contar los viewers activos en el mapa clients
          const count = Array.from(streamInfo.viewers).filter(v => clients.has(v)).length
          db.collection(STREAMS_COLLECTION).doc(client.streamId).update({ viewerCount: count }).catch(() => {})

          const payloadCount = JSON.stringify({ type: "viewer-count", count, streamId: client.streamId })
          streamInfo.viewers.forEach(v => {
            const viewerClient = clients.get(v)
            if (viewerClient) viewerClient.ws.send(payloadCount)
          })
          if (streamInfo.broadcasterId) {
            const broadcaster = clients.get(streamInfo.broadcasterId)
            if (broadcaster) broadcaster.ws.send(payloadCount)
          }
        }
      }
    }
  })
})

// Heartbeat Interval (Ping/Pong) - Limpia conexiones muertas cada 15 segundos
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate() // Dispara 'close' automáticamente limpiando la memoria
    }
    ws.isAlive = false
    ws.ping()
  })
}, 15000)

wss.on("close", () => {
  clearInterval(interval)
})

async function closeOrphanedLiveStreams() {
  try {
    const snap = await db
      .collection(STREAMS_COLLECTION)
      .where("status", "==", "live")
      .get()
    const endedAt = new Date().toISOString()
    for (const doc of snap.docs) {
      await doc.ref.update({ status: "ended", endedAt, viewerCount: 0 }) // Reiniciar contador a 0
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

// Cleanup expired tokens every hour
setInterval(async () => {
  const deletedResets = await cleanupExpiredTokens()
  if (deletedResets > 0) {
    console.log(`[Maintenance] Cleaned up ${deletedResets} expired reset token(s)`)
  }

  const deletedVerifications = await cleanupExpiredVerificationTokens()
  if (deletedVerifications > 0) {
    console.log(`[Maintenance] Cleaned up ${deletedVerifications} expired verification token(s)`)
  }
}, 60 * 60 * 1000) // every 1 hour
// Trigger restart
