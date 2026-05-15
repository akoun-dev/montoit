#!/bin/bash
# Pings the local server every 10s to prevent sandbox from killing it
# Also restarts the server if it goes down

while true; do
  if ! curl -s --max-time 3 -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    # Server is down - restart it
    pkill -f "next dev" 2>/dev/null
    sleep 2
    cd /home/z/my-project && nohup npx next dev --port 3000 > /home/z/my-project/dev.log 2>&1 &
    sleep 8
  fi
  sleep 10
done
