#!/bin/bash
# Mon Toit — Watchdog daemon using double-fork

cd /home/z/my-project

(
  (
    trap '' SIGHUP
    
    LOG="/home/z/my-project/watchdog.log"
    
    while true; do
      if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
        echo "[$(date)] Server down, restarting..." >> "$LOG"
        pkill -f "next dev" 2>/dev/null
        pkill -f "next-server" 2>/dev/null
        sleep 2
        /home/z/my-project/daemon.sh
        sleep 6
        if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
          echo "[$(date)] Server restarted successfully" >> "$LOG"
        else
          echo "[$(date)] Server restart FAILED" >> "$LOG"
        fi
      fi
      sleep 5
    done
  ) &
)
