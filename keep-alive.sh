#!/bin/bash
cd /home/z/my-project
while true; do
  # Check if server is running
  if ! curl -s -o /dev/null -w "" http://127.0.0.1:3000/ 2>/dev/null; then
    echo "[$(date)] Server down, restarting..." >> /home/z/my-project/keep-alive.log
    # Kill any leftover processes
    pkill -f "next dev" 2>/dev/null
    sleep 2
    # Start server
    npx next dev --port 3000 > /home/z/my-project/dev.log 2>&1 &
    disown
    sleep 8
    echo "[$(date)] Server restarted" >> /home/z/my-project/keep-alive.log
  fi
  sleep 10
done
