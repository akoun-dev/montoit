#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..." >> /home/z/my-project/dev.log
  node_modules/.bin/next dev --port 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT, restarting in 1s..." >> /home/z/my-project/dev.log
  sleep 1
done
