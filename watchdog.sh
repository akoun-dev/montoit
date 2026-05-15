#!/bin/bash
# Watchdog script: keeps Next.js dev server alive
# Restarts automatically when the server crashes or gets killed

LOG="/home/z/my-project/dev.log"
RESTART_LOG="/home/z/my-project/watchdog.log"

echo "[$(date)] Watchdog started" >> "$RESTART_LOG"

while true; do
  # Check if server is responding
  if ! curl -s --max-time 3 -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    echo "[$(date)] Server down, restarting..." >> "$RESTART_LOG"
    
    # Kill any leftover
    pkill -f "next dev" 2>/dev/null
    sleep 2
    
    # Start server fresh
    cd /home/z/my-project
    npx next dev --port 3000 > "$LOG" 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready (up to 20s)
    for i in $(seq 1 20); do
      sleep 1
      if curl -s --max-time 2 -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
        echo "[$(date)] Server restarted (PID $SERVER_PID)" >> "$RESTART_LOG"
        break
      fi
    done
  fi
  
  sleep 5
done
