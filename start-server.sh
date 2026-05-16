#!/bin/bash
# Mon Toit — Persistent server starter
# Uses setsid to detach from parent process group
cd /home/z/my-project
exec node node_modules/.bin/next dev -p 3000
