import { type NextRequest, NextResponse } from 'next/server'
import { updateSession, getUserRole } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Routes dont toutes les sous-routes sont publiques
const PUBLIC_ROUTE_PREFIXES = ['/api/auth/']

// Routes qui nécessitent un rôle spécifique
// Note: les routes multi-rôles ne sont pas listées ici pour éviter les faux positifs
const ROLE_ROUTES: Array<{ roles: string[]; prefixes: string[] }> = [
  { roles: ['LOCATAIRE'], prefixes: ['/api/dashboard/locataire', '/api/locataire/'] },
  { roles: ['PROPRIETAIRE'], prefixes: ['/api/dashboard/proprietaire', '/api/owner/', '/api/owner-file/'] },
  { roles: ['AGENCE'], prefixes: ['/api/dashboard/agence', '/api/agence/'] },
  { roles: ['ADMIN'], prefixes: ['/api/dashboard/admin', '/api/admin/'] },
  { roles: ['TIERS_CONFIANCE'], prefixes: ['/api/dashboard/tc', '/api/tc/'] },
]

// Routes protégées qui nécessitent une authentification
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
  '/api/properties/', // sous-routes (/properties/[id]/documents etc.)
]

/** Vérifie si le chemin est le listing public des propriétés (GET /api/properties) */
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
  try {
    const { response, user } = await updateSession(request)
    const { pathname } = request.nextUrl

    // Vérification d'authentification pour les routes API protégées
    if (isProtectedApiRoute(pathname) && !user) {
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Vérification de rôle pour les routes spécifiques
    if (user && isProtectedApiRoute(pathname)) {
      const allowedRoles = findRequiredRoles(pathname)

      if (allowedRoles) {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => request.cookies.getAll(),
              setAll: () => { /* read-only */ },
            },
          },
        )

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
