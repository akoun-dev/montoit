#!/bin/bash
# Mon Toit - Keep-Alive Wrapper for Next.js Dev Server
# Uses double-fork to fully detach the process from any shell session.
# This prevents the process from being killed when the parent shell exits.

cd /home/z/my-project

while true; do
  echo "[$(date)] Starting Next.js dev server..."
  
  # Double-fork for full detachment
  (
    (
      exec npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1
    ) &
  )
  
  # Wait for the server to start
  sleep 8
  
  # Monitor loop - check every 15 seconds
  while true; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "000" ]; then
      echo "[$(date)] Server is down! Restarting..."
      # Kill any orphan on port 3000
      fuser -k 3000/tcp 2>/dev/null || true
      sleep 2
      break  # Break inner loop to restart
    fi
    sleep 15
  done
done
