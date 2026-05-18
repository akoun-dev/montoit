# Task 5: Notification WebSocket Mini-Service

## Summary
Created a complete WebSocket notification mini-service for the Mon Toit real estate app, including:
- A Socket.IO server on port 3003 with REST endpoints for pushing notifications
- A frontend React hook (`useNotifications`) for real-time notification consumption
- A server-side utility (`notify.ts`) for creating notifications in DB + pushing via WebSocket

## Files Created/Modified

### New Files
1. **`/home/z/my-project/mini-services/notification-ws/package.json`** — Independent bun project config
2. **`/home/z/my-project/mini-services/notification-ws/index.ts`** — Socket.IO server with:
   - WebSocket connections on path `/socket.io/`
   - REST: `GET /health` — health check
   - REST: `POST /notify` — push notification to single user
   - REST: `POST /notify-many` — push notification to multiple users
   - User room management (`join` event with `{ userId }`)
   - Connected users tracking via `Map<userId, Set<socketId>>`
   - Clean disconnect handling
3. **`/home/z/my-project/mini-services/notification-ws/start.sh`** — Double-fork daemon starter
4. **`/home/z/my-project/src/hooks/use-notifications.ts`** — React hook that:
   - Connects to WebSocket at `/?XTransformPort=3003` with `path: '/socket.io/'`
   - Listens for `notification` events and shows toast notifications
   - Tracks unread count and notification list in state
   - Provides `markAsRead` and `markAllRead` functions
   - Auto-reconnects on disconnect
   - Fetches initial unread count from REST API
5. **`/home/z/my-project/src/lib/notify.ts`** — Server-side utility that:
   - Creates notification records in the database via Prisma
   - Pushes notifications via WebSocket (best-effort, non-blocking)
   - Supports single user (`notify`) and multi-user (`notifyMany`) variants

### Modified Files
- **`/home/z/my-project/package.json`** — Added `socket.io-client` dependency

## Key Design Decisions

1. **Socket.IO path**: Used `/socket.io/` (not `/`) to avoid conflict between Socket.IO transport and REST endpoints on the same HTTP server. This prevents Socket.IO from intercepting REST requests.

2. **Double-fork daemon**: Used a double-fork pattern with SIGHUP trap to keep the service running persistently, even after shell sessions end.

3. **Best-effort WebSocket push**: The `notify.ts` utility treats WebSocket pushes as non-blocking and best-effort — if the WS service is down, the DB record is still created and the main operation succeeds.

4. **User rooms**: Each user joins a room `user:${userId}` on connect, allowing targeted notification delivery.

5. **Lint compliance**: Replaced `socketRef.current` access during render with an `isConnected` state variable to satisfy React hooks lint rules.

## Testing
All endpoints verified working:
- `GET /health` → `{"status":"ok","service":"notification-ws",...}`
- `POST /notify` → `{"success":true,"notification":{...}}`
- `POST /notify-many` → `{"success":true,"sentCount":3,...}`

## Service Status
- Running on port 3003 as a daemon process
- Accessible via Caddy gateway with `?XTransformPort=3003`
