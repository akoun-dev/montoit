#!/bin/bash
while true; do
  sleep 15
  curl -s -o /dev/null http://localhost:3000/ 2>/dev/null
done
