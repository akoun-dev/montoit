#!/bin/bash
cd /home/z/my-project
exec npx next dev -p 3000 --turbopack >> /home/z/my-project/dev.log 2>&1
