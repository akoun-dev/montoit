#!/bin/bash
# Mon Toit — Keep-alive daemon using double-fork

(
  (
    trap '' SIGHUP
    
    while true; do
      sleep 3
      curl -s -o /dev/null http://localhost:3000/ 2>/dev/null
    done
  ) &
)
