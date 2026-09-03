import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getUserRole } from '@/lib/supabase/middleware'
import type { Database } from '@/lib/supabase/types'
import { SESSION_COOKIE_NAME } from '@/lib/session-constants'

const PUBLIC_ROUTE_PREFIXES = ['/api/auth/', '/api/properties/reviews']

const ROLE_ROUTES: Array<{ roles: string[]; prefixes: string[] }> = [
  { roles: ['LOCATAIRE'], prefixes: ['/api/dashboard/locataire', '/api/locataire/'] },
  { roles: ['PROPRIETAIRE'], prefixes: ['/api/dashboard/proprietaire', '/api/owner/', '/api/owner-file/'] },
  { roles: ['AGENCE'], prefixes: ['/api/dashboard/agence', '/api/agence/'] },
  { roles: ['ADMIN'], prefixes: ['/api/dashboard/admin', '/api/admin/'] },
  { roles: ['TIERS_CONFIANCE'], prefixes: ['/api/dashboard/tc', '/api/tc/'] },
]

const PROTECTED_API_PREFIXES = [
  '/api/dashboard/',
  '/api/admin/',
  '/api/tc/',
  '/api/agence/',
  '/api/applications',
  '/api/visits',
  '/api/payments',
  '/api/leases',
  '/api/mandats',
  '/api/rental-file',
  '/api/owner-file',
  '/api/owner/',
  '/api/locataire/',
  '/api/notifications',
  '/api/messages',
  '/api/maintenance',
  '/api/disputes',
  '/api/reviews',
  '/api/users',
  '/api/profile',
  '/api/properties/',
]

function isPropertiesListing(pathname: string): boolean {
  return pathname === '/api/properties' || pathname === '/api/properties/'
}

function isPublicRoute(pathname: string): boolean {
  if (isPropertiesListing(pathname)) return true
  return PUBLIC_ROUTE_PREFIXES.some(route => pathname.startsWith(route))
}

function isProtectedApiRoute(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return false
  if (isPublicRoute(pathname)) return false
  return PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function findRequiredRoles(pathname: string): string[] | null {
  for (const entry of ROLE_ROUTES) {
    for (const prefix of entry.prefixes) {
      if (pathname === prefix || pathname.startsWith(prefix + (prefix.endsWith('/') ? '' : '/'))) {
        return entry.roles
      }
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = request.nextUrl

    // Custom SMS sessions are resolved by route handlers. Only redirect when
    // neither Supabase Auth nor the custom session cookie is present.
    if (isProtectedApiRoute(pathname) && !user && !request.cookies.has(SESSION_COOKIE_NAME)) {
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (user && isProtectedApiRoute(pathname)) {
      const allowedRoles = findRequiredRoles(pathname)

      if (allowedRoles) {
        const userRole = await getUserRole(supabase, user.id)

        if (!userRole || !allowedRoles.includes(userRole.activeRole)) {
          return NextResponse.json(
            { error: 'Accès non autorisé pour ce rôle', allowedRoles, currentRole: userRole?.activeRole },
            { status: 403 },
          )
        }
      }
    }

    return response
  } catch (error) {
    console.error('[middleware] Error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
