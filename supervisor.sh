#!/bin/bash
# Mon Toit Service Supervisor
# Keeps both the Next.js dev server and notification-ws service running
# Usage: bash supervisor.sh (run once, it handles restarts)

set -e

PROJECT_DIR="/home/z/my-project"
NOTIF_DIR="$PROJECT_DIR/mini-services/notification-ws"
LOG_DIR="/tmp/montoit-logs"

mkdir -p "$LOG_DIR"

# ─── Cleanup function ────────────────────────────────────────────────────────
cleanup() {
  echo "[supervisor] Shutting down all services..."
  if [ -n "$NEXTJS_PID" ] && kill -0 "$NEXTJS_PID" 2>/dev/null; then
    kill "$NEXTJS_PID" 2>/dev/null || true
  fi
  if [ -n "$NOTIF_PID" ] && kill -0 "$NOTIF_PID" 2>/dev/null; then
    kill "$NOTIF_PID" 2>/dev/null || true
  fi
  # Kill any orphan processes on our ports
  fuser -k 3000/tcp 2>/dev/null || true
  fuser -k 3003/tcp 2>/dev/null || true
  exit 0
}

trap cleanup SIGTERM SIGINT

# ─── Start notification-ws ──────────────────────────────────────────────────
start_notification_ws() {
  echo "[supervisor] Starting notification-ws on port 3003..."
  cd "$NOTIF_DIR"
  # Kill any existing process on port 3003
  fuser -k 3003/tcp 2>/dev/null || true
  sleep 1
  nohup bun index.ts >> "$LOG_DIR/notification-ws.log" 2>&1 &
  NOTIF_PID=$!
  echo "[supervisor] notification-ws started (PID: $NOTIF_PID)"
}

# ─── Start Next.js dev server ───────────────────────────────────────────────
start_nextjs() {
  echo "[supervisor] Starting Next.js dev server on port 3000..."
  cd "$PROJECT_DIR"
  # Kill any existing process on port 3000
  fuser -k 3000/tcp 2>/dev/null || true
  sleep 1
  nohup npx next dev -p 3000 >> "$LOG_DIR/nextjs.log" 2>&1 &
  NEXTJS_PID=$!
  echo "[supervisor] Next.js started (PID: $NEXTJS_PID)"
}

# ─── Check if a service is alive ────────────────────────────────────────────
check_nextjs() {
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5 2>/dev/null || echo "000"
}

check_notif_ws() {
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/health --max-time 5 2>/dev/null || echo "000"
}

# ─── Initial startup ────────────────────────────────────────────────────────
start_notification_ws
start_nextjs

# Wait for initial startup
echo "[supervisor] Waiting for services to be ready..."
for i in $(seq 1 30); do
  NEXTJS_STATUS=$(check_nextjs)
  NOTIF_STATUS=$(check_notif_ws)
  if [ "$NEXTJS_STATUS" != "000" ] && [ "$NOTIF_STATUS" != "000" ]; then
    echo "[supervisor] All services are up!"
    break
  fi
  sleep 2
done

# ─── Watchdog loop ──────────────────────────────────────────────────────────
echo "[supervisor] Entering watchdog loop (checking every 15s)..."
while true; do
  # Check Next.js
  NEXTJS_STATUS=$(check_nextjs)
  if [ "$NEXTJS_STATUS" = "000" ]; then
    echo "[supervisor] Next.js is down! Restarting..."
    start_nextjs
    sleep 5
  fi

  # Check notification-ws
  NOTIF_STATUS=$(check_notif_ws)
  if [ "$NOTIF_STATUS" = "000" ]; then
    echo "[supervisor] notification-ws is down! Restarting..."
    start_notification_ws
    sleep 3
  fi

  sleep 15
done
