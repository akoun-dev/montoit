import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getLocalPgPool } from '@/lib/pg-pool'

/**
 * GoTrue-lite — émulation locale de Supabase Auth (option B, sandbox).
 *
 * NEXT_PUBLIC_SUPABASE_URL pointe vers cette application : supabase-js côté
 * serveur appelle donc `/auth/v1/*` ici. Cette émulation couvre le minimum
 * nécessaire à l'application en environnement de test :
 *
 *  - POST /auth/v1/token?grant_type=password      → login email + mot de passe
 *  - POST /auth/v1/token?grant_type=refresh_token → rafraîchissement
 *  - GET  /auth/v1/user                           → validation du JWT (Bearer)
 *  - POST /auth/v1/logout                         → suppression de session
 *
 * Les tokens sont des identifiants aléatoires stockés dans la table
 * `sessions` (même modèle que le login SMS de l'application). Le mot de passe
 * est vérifié contre `users.password_hash` (bcrypt) de la base locale.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SESSION_TTL_DAYS = 30
const EXPIRES_IN_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60

type UserRow = {
  id: string
  email: string | null
  phone: string | null
  password_hash: string | null
  is_active: boolean
  created_at?: string | Date | null
}

function jsonError(status: number, code: string, description: string) {
  return NextResponse.json({ code, error: code, msg: description, error_description: description }, { status })
}

function nowIso(): string {
  return new Date().toISOString()
}

function goTrueUser(u: UserRow) {
  return {
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email ?? '',
    phone: u.phone ?? '',
    email_confirmed_at: nowIso(),
    phone_confirmed_at: nowIso(),
    confirmed_at: nowIso(),
    last_sign_in_at: nowIso(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: u.created_at ? new Date(u.created_at as any).toISOString() : nowIso(),
    updated_at: nowIso(),
  }
}

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

async function getUserByBearer(req: NextRequest): Promise<UserRow | null> {
  const token = bearerToken(req)
  if (!token) return null
  const pool = getLocalPgPool()
  const { rows } = await pool.query<UserRow>(
    `SELECT u.id, u.email, u.phone, u.password_hash, u.is_active, u.created_at
       FROM public.sessions s
       JOIN public.users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()
      LIMIT 1`,
    [token],
  )
  return rows[0] ?? null
}

function newToken(): string {
  return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
}

async function createSession(userId: string): Promise<string> {
  const token = newToken()
  const pool = getLocalPgPool()
  await pool.query(
    `INSERT INTO public.sessions (id, token, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, now() + ($4 || ' days')::interval, now())`,
    [crypto.randomUUID(), token, userId, String(SESSION_TTL_DAYS)],
  )
  return token
}

async function handleToken(req: NextRequest): Promise<NextResponse> {
  const grantType = req.nextUrl.searchParams.get('grant_type') ?? 'password'
  const pool = getLocalPgPool()

  if (grantType === 'refresh_token') {
    const body = (await req.json().catch(() => ({}))) as { refresh_token?: string }
    const refreshToken = body.refresh_token
    if (!refreshToken) return jsonError(400, 'invalid_grant', 'Refresh token manquant')

    const { rows } = await pool.query<UserRow>(
      `SELECT u.id, u.email, u.phone, u.password_hash, u.is_active, u.created_at
         FROM public.sessions s
         JOIN public.users u ON u.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > now()
        LIMIT 1`,
      [refreshToken],
    )
    const user = rows[0]
    if (!user || !user.is_active) return jsonError(400, 'invalid_grant', 'Session invalide ou expirée')

    await pool.query(
      `UPDATE public.sessions SET expires_at = now() + ($1 || ' days')::interval WHERE token = $2`,
      [String(SESSION_TTL_DAYS), refreshToken],
    )

    const expiresAt = Math.floor(Date.now() / 1000) + EXPIRES_IN_SECONDS
    return NextResponse.json({
      access_token: refreshToken,
      token_type: 'bearer',
      expires_in: EXPIRES_IN_SECONDS,
      expires_at: expiresAt,
      refresh_token: refreshToken,
      user: goTrueUser(user),
    })
  }

  if (grantType !== 'password') {
    return jsonError(400, 'unsupported_grant_type', `Grant type non supporté : ${grantType}`)
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string }
  const email = (body.email ?? '').trim()
  const password = body.password ?? ''
  if (!email || !password) {
    return jsonError(400, 'invalid_grant', 'Email et mot de passe requis')
  }

  const { rows } = await pool.query<UserRow>(
    `SELECT id, email, phone, password_hash, is_active, created_at
       FROM public.users
      WHERE lower(email) = lower($1)
      LIMIT 1`,
    [email],
  )
  const user = rows[0]
  if (!user || !user.is_active || !user.password_hash) {
    return jsonError(400, 'invalid_grant', 'Email ou mot de passe incorrect')
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash)
  if (!passwordOk) {
    return jsonError(400, 'invalid_grant', 'Email ou mot de passe incorrect')
  }

  const token = await createSession(user.id)
  const expiresAt = Math.floor(Date.now() / 1000) + EXPIRES_IN_SECONDS
  return NextResponse.json({
    access_token: token,
    token_type: 'bearer',
    expires_in: EXPIRES_IN_SECONDS,
    expires_at: expiresAt,
    refresh_token: token,
    user: goTrueUser(user),
  })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }): Promise<NextResponse> {
  const { path = [] } = await ctx.params
  try {
    if (path[0] === 'user') {
      const user = await getUserByBearer(req)
      if (!user || !user.is_active) {
        return jsonError(401, 'bad_jwt', 'Invalid JWT')
      }
      return NextResponse.json(goTrueUser(user))
    }
    return jsonError(404, 'not_found', 'Endpoint GoTrue inconnu')
  } catch (error) {
    console.error('[gotrue-lite] GET error:', error)
    return jsonError(500, 'unexpected_failure', 'Erreur serveur GoTrue-lite')
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }): Promise<NextResponse> {
  const { path = [] } = await ctx.params
  try {
    if (path[0] === 'token') {
      return await handleToken(req)
    }
    if (path[0] === 'logout') {
      const token = bearerToken(req)
      if (token) {
        const pool = getLocalPgPool()
        await pool.query(`DELETE FROM public.sessions WHERE token = $1`, [token])
      }
      return new NextResponse(null, { status: 204 })
    }
    return jsonError(404, 'not_found', 'Endpoint GoTrue inconnu')
  } catch (error) {
    console.error('[gotrue-lite] POST error:', error)
    return jsonError(500, 'unexpected_failure', 'Erreur serveur GoTrue-lite')
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 })
}
