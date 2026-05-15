#!/bin/bash
# Keep-alive: restart the Next.js server automatically when it dies
cd /home/z/my-project
while true; do
  if ! lsof -ti:3000 >/dev/null 2>&1; then
    echo "[$(date)] Server dead, restarting..." >> /home/z/my-project/dev.log
    node_modules/.bin/next dev --port 3000 >> /home/z/my-project/dev.log 2>&1 &
    sleep 5
  fi
  sleep 3
done
