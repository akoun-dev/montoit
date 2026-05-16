#!/bin/bash
# Mon Toit — Watchdog v2: Restarts Next.js if it dies
# Runs in its own session, independent of bash
LOG="/home/z/my-project/watchdog.log"

while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Server down, restarting..." >> "$LOG"
    cd /home/z/my-project
    pkill -f "next dev" 2>/dev/null
    pkill -f "next-server" 2>/dev/null
    sleep 2
    setsid node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
    sleep 6
    if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
      echo "[$(date)] Server restarted successfully" >> "$LOG"
    else
      echo "[$(date)] Server restart FAILED" >> "$LOG"
    fi
  fi
  sleep 5
done
