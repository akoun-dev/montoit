import { execSync } from 'child_process'
import { existsSync, cpSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

const standalone = join(process.cwd(), '.next', 'standalone')

// Find server.js (Next.js 16 trace le chemin absolu)
const result = execSync(
  `find "${standalone}" -name "server.js" -not -path "*/node_modules/*"`,
  { encoding: 'utf8' }
).trim()

if (!result) {
  console.error('server.js introuvable dans .next/standalone')
  process.exit(1)
}

const serverDir = dirname(result.split('\n')[0])
console.log(`Copie des assets vers ${serverDir}`)

// Copier .next/static
const staticSrc = join(process.cwd(), '.next', 'static')
const staticDst = join(serverDir, '.next', 'static')
if (existsSync(staticSrc)) {
  mkdirSync(join(serverDir, '.next'), { recursive: true })
  cpSync(staticSrc, staticDst, { recursive: true })
}

// Copier public/
const publicSrc = join(process.cwd(), 'public')
const publicDst = join(serverDir, 'public')
if (existsSync(publicSrc)) {
  mkdirSync(serverDir, { recursive: true })
  cpSync(publicSrc, publicDst, { recursive: true })
}

console.log('Assets copiés avec succès')
