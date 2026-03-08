import http from "http"
import { WebSocketServer } from "ws"
import app from "./app.js"

const PORT = process.env.PORT || 4000

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
  })

  ws.on("close", () => {
    clients.delete(clientId)
    if (client.streamId) {
      const streamInfo = streams.get(client.streamId)
      if (!streamInfo) return
      if (client.role === "broadcaster") {
        // Notificar a los viewers que el stream terminó
        streamInfo.viewers.forEach((viewerId) => {
          const viewer = clients.get(viewerId)
          if (viewer) {
            viewer.ws.send(
              JSON.stringify({
                type: "stream-ended",
                streamId: client.streamId,
              })
            )
          }
        })
        streams.delete(client.streamId)
      } else if (client.role === "viewer") {
        streamInfo.viewers.delete(clientId)
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})