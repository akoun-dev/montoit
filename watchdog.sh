#!/bin/bash
# Mon Toit — Watchdog: Auto-restart Next.js if it dies
LOG="/home/z/my-project/watchdog.log"

while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Server down, restarting..." >> "$LOG"
    cd /home/z/my-project
    pkill -f "next-server" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    sleep 2
    node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
    sleep 6
    if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
      echo "[$(date)] Server restarted successfully" >> "$LOG"
    else
      echo "[$(date)] Server restart FAILED" >> "$LOG"
    fi
  fi
  sleep 5
done
