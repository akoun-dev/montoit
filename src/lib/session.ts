import crypto from 'crypto'

const SESSION_DURATION_DAYS = 30

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex')
}

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
}

export async function createSession(
  supabase: ReturnType<typeof import('@/lib/supabase/admin').getSupabaseAdminClient>,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken()
  const expiresAt = getSessionExpiry()

  await supabase.from('sessions').insert({
    token,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
  })

  return { token, expiresAt }
}

export async function deleteSession(
  supabase: ReturnType<typeof import('@/lib/supabase/admin').getSupabaseAdminClient>,
  token: string,
): Promise<void> {
  await supabase.from('sessions').delete().eq('token', token).catch(() => {})
}

export const SESSION_COOKIE_NAME = 'montoit-session'
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  path: '/',
}
