#!/bin/bash
# Mon Toit — Daemon starter using double-fork
# This creates a fully detached process that survives shell death

cd /home/z/my-project

# First fork
(
  # Second fork - fully detached
  (
    # Trap SIGHUP to prevent death
    trap '' SIGHUP
    
    # Start Next.js
    exec node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  ) &
  # First fork exits immediately
)
# Parent returns immediately
