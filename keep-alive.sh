#!/bin/bash
# Self-restarting wrapper for the Next.js dev server
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js dev server..."
  npx next dev -p 3000 2>&1 | tee /home/z/my-project/dev.log
  EXIT_CODE=$?
  echo "[$(date)] Next.js exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
