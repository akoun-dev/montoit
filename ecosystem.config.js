/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process')
const path = require('path')

let scriptPath = '.next/standalone/server.js'
try {
  const found = execSync(
    `find "${path.join(__dirname, '.next/standalone')}" -name "server.js" -not -path "*/node_modules/*"`,
    { encoding: 'utf8' }
  ).trim()
  if (found) scriptPath = found.split('\n')[0]
} catch {}

module.exports = {
  apps: [{
    name: 'montoit',
    script: scriptPath,
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
  }],
}
