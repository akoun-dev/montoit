import 'server-only'

import { Pool } from 'pg'

/**
 * Pool PostgreSQL local — émulation Supabase (option B, sandbox uniquement).
 *
 * En sandbox, `NEXT_PUBLIC_SUPABASE_URL` pointe vers cette application même :
 * les routes `/rest/v1/*` (PostgREST-lite) et `/auth/v1/*` (GoTrue-lite) jouent
 * le rôle des services Supabase et interrogent la base locale (Postgres 18
 * embarqué, voir `db/`) via ce pool.
 *
 * ⚠️ Réservé au serveur (routes API Next.js). La connexion est superuser :
 * elle court-circuite la RLS, comme le client `service_role` de Supabase.
 */
let pool: Pool | undefined

export function getLocalPgPool(): Pool {
  if (!pool) {
    // POSTGRES_URL = URL du Postgres local (db/start-pg.mjs) ; DATABASE_URL
    // est utilisée en repli (attention : elle peut être une URL Prisma SQLite).
    const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
    if (!connectionString || connectionString.startsWith('file:')) {
      throw new Error('Missing POSTGRES_URL — base Postgres locale non configurée.')
    }
    pool = new Pool({ connectionString, max: 10 })
  }
  return pool
}
