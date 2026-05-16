import { db } from '@/lib/db'
import crypto from 'crypto'
import { NextRequest } from 'next/server'

const SESSION_DURATION_DAYS = 30 // 30-day sliding session
const SESSION_REFRESH_THRESHOLD_DAYS = 7 // Refresh if expiring within 7 days

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex')
}

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  // Delete any existing sessions for this user (single session per user)
  await db.session.deleteMany({ where: { userId } })

  const token = generateSessionToken()
  const expiresAt = getSessionExpiry()

  await db.session.create({
    data: { token, userId, expiresAt },
  })

  return { token, expiresAt }
}

export async function validateSession(token: string): Promise<{ valid: boolean; userId?: string; shouldRefresh?: boolean }> {
  const session = await db.session.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true },
  })

  if (!session) {
    return { valid: false }
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await db.session.delete({ where: { token } }).catch(() => {})
    return { valid: false }
  }

  // Check if we should refresh (sliding session)
  const refreshThreshold = new Date(Date.now() + SESSION_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)
  const shouldRefresh = session.expiresAt < refreshThreshold

  return { valid: true, userId: session.userId, shouldRefresh }
}

export async function refreshSession(token: string): Promise<{ newToken: string; expiresAt: Date } | null> {
  const session = await db.session.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true },
  })

  if (!session || session.expiresAt < new Date()) {
    return null
  }

  // Delete old session
  await db.session.delete({ where: { token } })

  // Create new session
  return createSession(session.userId)
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.delete({ where: { token } }).catch(() => {})
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } })
}

// Clean up expired sessions (call periodically)
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}

/**
 * Helper for API routes: extract userId from the session cookie.
 * Returns null if no valid session.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!sessionToken) return null

  const result = await validateSession(sessionToken)
  if (!result.valid || !result.userId) return null

  return result.userId
}

// Cookie configuration
export const SESSION_COOKIE_NAME = 'montoit-session'
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60, // 30 days in seconds
  path: '/',
}
