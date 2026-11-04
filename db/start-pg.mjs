/**
 * Démarre le cluster PostgreSQL local (s'il n'est pas déjà lancé).
 * Usage: node db/start-pg.mjs
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PG = path.join(ROOT, 'node_modules', '@embedded-postgres', 'linux-x64', 'native', 'bin');
const PGDATA = path.join(ROOT, 'db', 'pgdata');
const LOG = path.join(ROOT, 'db', 'pg.log');

function pgAlive() {
  try {
    execFileSync(path.join(PG, 'pg_ctl'), ['-D', PGDATA, 'status'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

if (pgAlive()) {
  console.log('ℹ️  PostgreSQL déjà démarré (port 5432)');
  process.exit(0);
}

if (!fs.existsSync(path.join(PGDATA, 'PG_VERSION'))) {
  console.log('📦 Initialisation du cluster...');
  execFileSync(path.join(PG, 'initdb'), ['-D', PGDATA, '-U', 'postgres', '-A', 'trust', '--encoding=UTF8', '--locale=C'], { stdio: 'inherit' });
}

execFileSync(path.join(PG, 'pg_ctl'), ['-D', PGDATA, '-l', LOG, '-o', '-p 5432 -c listen_addresses=127.0.0.1 -k ' + ROOT + '/db', 'start'], { stdio: 'inherit' });
console.log('✅ PostgreSQL démarré — postgresql://postgres@127.0.0.1:5432/montoit');
