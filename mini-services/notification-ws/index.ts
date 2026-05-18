import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'

const PORT = 3003

// ─── Connected Users Map ─────────────────────────────────────────────────────
// Maps userId → Set<socketId> (a user may have multiple tabs/devices)
const connectedUsers = new Map<string, Set<string>>()

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parseBody(req: IncomingMessage, callback: (data: any) => void, onError: () => void) {
  let body = ''
  req.on('data', (chunk: Buffer) => { body += chunk.toString() })
  req.on('end', () => {
    try {
      callback(JSON.parse(body))
    } catch {
      onError()
    }
  })
  req.on('error', onError)
}

// ─── HTTP Server with REST handlers ──────────────────────────────────────────
const httpServer = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)

  // GET /health
  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'notification-ws',
      port: PORT,
      connectedUsers: connectedUsers.size,
      timestamp: new Date().toISOString(),
    })
    return
  }

  // POST /notify — send notification to a single user
  if (req.method === 'POST' && url.pathname === '/notify') {
    parseBody(req, (data) => {
      const { userId, type, title, message, actionUrl, entityId } = data

      if (!userId || !type || !title || !message) {
        sendJson(res, 400, { error: 'userId, type, title, and message are required' })
        return
      }

      const notification = {
        id: generateId(),
        type,
        title,
        message,
        actionUrl: actionUrl || null,
        entityId: entityId || null,
        isRead: false,
        createdAt: new Date().toISOString(),
      }

      io.to(`user:${userId}`).emit('notification', notification)
      console.log(`[notify] Sent "${type}" notification to user:${userId} (title: "${title}")`)

      sendJson(res, 200, { success: true, notification })
    }, () => {
      sendJson(res, 400, { error: 'Invalid JSON body' })
    })
    return
  }

  // POST /notify-many — send notification to multiple users
  if (req.method === 'POST' && url.pathname === '/notify-many') {
    parseBody(req, (data) => {
      const { userIds, type, title, message, actionUrl, entityId } = data

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        sendJson(res, 400, { error: 'userIds (non-empty array) is required' })
        return
      }

      if (!type || !title || !message) {
        sendJson(res, 400, { error: 'type, title, and message are required' })
        return
      }

      const notification = {
        id: generateId(),
        type,
        title,
        message,
        actionUrl: actionUrl || null,
        entityId: entityId || null,
        isRead: false,
        createdAt: new Date().toISOString(),
      }

      let sentCount = 0
      for (const userId of userIds) {
        io.to(`user:${userId}`).emit('notification', notification)
        sentCount++
      }

      console.log(`[notify-many] Sent "${type}" notification to ${sentCount} users (title: "${title}")`)
      sendJson(res, 200, { success: true, sentCount, notification })
    }, () => {
      sendJson(res, 400, { error: 'Invalid JSON body' })
    })
    return
  }

  // Fallback: 404
  sendJson(res, 404, { error: 'Not found' })
})

// ─── Socket.IO Server ───────────────────────────────────────────────────────
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Socket.IO Connection Handling ──────────────────────────────────────────
io.on('connection', (socket: Socket) => {
  console.log(`[connect] Socket ${socket.id} connected`)

  // User joins their room via "join" event
  socket.on('join', (data: { userId: string }) => {
    const { userId } = data
    if (!userId) {
      console.warn(`[join] Socket ${socket.id} sent join without userId`)
      return
    }

    // Join the user-specific room
    socket.join(`user:${userId}`)

    // Track in the connected users map
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set())
    }
    connectedUsers.get(userId)!.add(socket.id)

    console.log(
      `[join] User ${userId} joined room user:${userId} (socket: ${socket.id}, total sockets for user: ${connectedUsers.get(userId)!.size})`
    )
  })

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    // Clean up the user from the map
    for (const [userId, sockets] of connectedUsers.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          connectedUsers.delete(userId)
        }
        console.log(
          `[disconnect] Socket ${socket.id} disconnected (user:${userId}, reason: ${reason}, remaining sockets: ${sockets.size})`
        )
        break
      }
    }
  })

  socket.on('error', (error) => {
    console.error(`[error] Socket ${socket.id} error:`, error)
  })
})

// ─── Start Server ────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[notification-ws] Notification WebSocket server running on port ${PORT}`)
  console.log(`[notification-ws] REST endpoints: GET /health, POST /notify, POST /notify-many`)
  console.log(`[notification-ws] Socket.IO path: /socket.io/`)
  console.log(`[notification-ws] Socket.IO events: join, notification`)
})

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[notification-ws] Received SIGTERM, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('[notification-ws] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[notification-ws] Received SIGINT, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('[notification-ws] Server closed')
    process.exit(0)
  })
})
