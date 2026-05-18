#!/bin/bash
# Notification WebSocket Service — Daemon starter using double-fork
# This creates a fully detached process that survives shell death

cd /home/z/my-project/mini-services/notification-ws

# First fork
(
  # Second fork - fully detached
  (
    # Trap SIGHUP to prevent death
    trap '' SIGHUP
    
    # Start notification-ws
    exec bun index.ts >> /tmp/notification-ws.log 2>&1
  ) &
  # First fork exits immediately
)
# Parent returns immediately
