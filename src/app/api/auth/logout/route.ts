import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/session'

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value

  if (sessionToken) {
    await deleteSession(sessionToken).catch(() => {})
  }

  const response = NextResponse.json({ message: 'Déconnexion réussie' })
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  // Also clear the old cookie name in case it still exists
  response.cookies.set('montoit-user-id', '', { maxAge: 0, path: '/' })
  return response
}
