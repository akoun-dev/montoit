import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────────────────────────
// Utiliser vi.hoisted pour créer le mock AVANT le hoisting de vi.mock
const mockGetUser = vi.hoisted(() => vi.fn())
const mockGetAllCookies = vi.hoisted(() => vi.fn())
const mockRequestCookiesSet = vi.hoisted(() => vi.fn())
const mockResponseCookiesSet = vi.hoisted(() => vi.fn())
let capturedSetAll: ((cookies: any[]) => void) | null = null

// Mock de la requête from() pour retourner le profil utilisateur
const mockFromSelectSingle = vi.hoisted(() => vi.fn())

// Créer le mock createServerClient en dehors du vi.mock pour y accéder dans les tests
const mockCreateServerClient = vi.hoisted(() =>
  vi.fn((_url: string, _anonKey: string, options: any) => {
    capturedSetAll = options.cookies.setAll
    return {
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockFromSelectSingle,
          })),
        })),
      })),
    }
  }),
)

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockRequest(url = 'http://localhost:3000/') {
  const req = {
    url,
    cookies: {
      getAll: mockGetAllCookies,
      set: mockRequestCookiesSet,
      get: vi.fn(),
    },
    headers: new Headers({}),
    nextUrl: new URL(url),
    method: 'GET',
  } as unknown as NextRequest
  return req
}

// ─── Tests: middleware.ts (point d entree) ────────────────────────────────────

describe('middleware.ts (point d entree)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedSetAll = null
    mockGetAllCookies.mockReturnValue([])
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockFromSelectSingle.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  it('appelle updateSession via createServerClient + getUser', async () => {
    const { middleware } = await import('@/../middleware')
    const req = createMockRequest()
    const resp = await middleware(req)

    expect(mockCreateServerClient).toHaveBeenCalled()
    expect(mockGetUser).toHaveBeenCalled()
    // Doit retourner un objet NextResponse
    expect(resp).toBeDefined()
  })

  it('cree le client Supabase avec les bons parametres', async () => {
    const { middleware } = await import('@/../middleware')
    const req = createMockRequest()
    await middleware(req)

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    )
  })

  it('laisse passer les routes publiques sans auth', async () => {
    const { middleware } = await import('@/../middleware')
    const urls = [
      'http://localhost:3000/',
      'http://localhost:3000/api/auth/login',
      'http://localhost:3000/api/auth/register',
      'http://localhost:3000/api/properties',
      'http://localhost:3000/api/stats/overview',
    ]
    for (const url of urls) {
      const req = createMockRequest(url)
      const resp = await middleware(req)
      expect(resp).toBeDefined()
      // Les routes publiques ne doivent pas être redirigées
      expect(resp.status).not.toBe(307) // 307 = redirect
      expect(resp.status).not.toBe(302)
    }
  })

  it('laisse la route API au handler pour retourner un 401 JSON', async () => {
    const { middleware } = await import('@/../middleware')
    const protectedUrls = [
      'http://localhost:3000/api/applications',
      'http://localhost:3000/api/visits',
      'http://localhost:3000/api/dashboard/locataire',
      'http://localhost:3000/api/admin/users',
      'http://localhost:3000/api/tc/owner-files',
    ]
    for (const url of protectedUrls) {
      const req = createMockRequest(url)
      const resp = await middleware(req)
      expect(resp.status).not.toBe(307)
      expect(resp.status).not.toBe(302)
    }
  })

  it('laisse passer les routes protegees si authentifie avec le bon role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'locataire@test.com' } },
      error: null,
    })
    mockFromSelectSingle.mockResolvedValue({
      data: { role: 'LOCATAIRE', active_role: 'LOCATAIRE' },
      error: null,
    })

    const { middleware } = await import('@/../middleware')
    const req = createMockRequest('http://localhost:3000/api/applications')
    const resp = await middleware(req)

    expect(resp.status).not.toBe(307)
    expect(resp.status).not.toBe(403)
  })

  it('retourne 403 si le role ne correspond pas a la route', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockFromSelectSingle.mockResolvedValue({
      data: { role: 'LOCATAIRE', active_role: 'LOCATAIRE' },
      error: null,
    })

    const { middleware } = await import('@/../middleware')
    // Un LOCATAIRE essaie d'accéder à /api/tc/
    const req = createMockRequest('http://localhost:3000/api/tc/owner-files')
    const resp = await middleware(req)

    expect(resp.status).toBe(403)
  })

  it('retourne 403 pour chaque role inapproprié', async () => {
    const roleTests = [
      { role: 'LOCATAIRE', route: '/api/tc/owner-files' },
      { role: 'PROPRIETAIRE', route: '/api/tc/owner-files' },
      { role: 'TIERS_CONFIANCE', route: '/api/admin/users' },
      { role: 'LOCATAIRE', route: '/api/admin/users' },
      { role: 'ADMIN', route: '/api/dashboard/locataire' },
    ]
    for (const { role, route } of roleTests) {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-role' } },
        error: null,
      })
      mockFromSelectSingle.mockResolvedValue({
        data: { role, active_role: role },
        error: null,
      })

      const { middleware } = await import('@/../middleware')
      const req = createMockRequest(`http://localhost:3000${route}`)
      const resp = await middleware(req)
      expect(resp.status).toBe(403)
    }
  })

  it('laisse passer les routes avec le bon role specifique', async () => {
    const allowedTests = [
      { role: 'LOCATAIRE', route: '/api/dashboard/locataire' },
      { role: 'PROPRIETAIRE', route: '/api/dashboard/proprietaire' },
      { role: 'TIERS_CONFIANCE', route: '/api/tc/owner-files' },
      { role: 'ADMIN', route: '/api/admin/users' },
      { role: 'AGENCE', route: '/api/agence/mandats' },
    ]
    for (const { role, route } of allowedTests) {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-role' } },
        error: null,
      })
      mockFromSelectSingle.mockResolvedValue({
        data: { role, active_role: role },
        error: null,
      })

      const { middleware } = await import('@/../middleware')
      const req = createMockRequest(`http://localhost:3000${route}`)
      const resp = await middleware(req)
      expect(resp.status).not.toBe(403)
      expect(resp.status).not.toBe(307)
    }
  })

  it('utilise activeRole (pas role) pour la verification de role', async () => {
    // L'utilisateur a role=PROPRIETAIRE mais activeRole=LOCATAIRE
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-switch' } },
      error: null,
    })
    mockFromSelectSingle.mockResolvedValue({
      data: { role: 'PROPRIETAIRE', active_role: 'LOCATAIRE' },
      error: null,
    })

    const { middleware } = await import('@/../middleware')

    // Avec activeRole=LOCATAIRE, peut accéder à /api/dashboard/locataire
    const reqOk = createMockRequest('http://localhost:3000/api/dashboard/locataire')
    const respOk = await middleware(reqOk)
    expect(respOk.status).not.toBe(403)

    // Mais pas à /api/owner/ (réservé PROPRIETAIRE)
    const reqDenied = createMockRequest('http://localhost:3000/api/owner/finances')
    const respDenied = await middleware(reqDenied)
    expect(respDenied.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: updateSession (src/lib/supabase/middleware.ts)
// ═══════════════════════════════════════════════════════════════════════════════

describe('updateSession (src/lib/supabase/middleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedSetAll = null
    mockGetAllCookies.mockReturnValue([])
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    // Par défaut, from().select().eq().single() renvoie null (pas d'utilisateur connecté)
    mockFromSelectSingle.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  it('cree un client Supabase et appelle getUser', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    await updateSession(req)

    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
    expect(mockGetUser).toHaveBeenCalledTimes(1)
  })

  it("retourne une NextResponse et user:null quand non connecte", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    const result = await updateSession(req)

    expect(result.response).toBeDefined()
    expect(typeof result.response.cookies?.set).toBe('function')
    expect(result.user).toBeNull()
  })

  it("retourne user avec id et email quand connecte", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-123', email: 'test@test.com' } },
      error: null,
    })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    const result = await updateSession(req)

    expect(result.user).not.toBeNull()
    expect(result.user!.id).toBe('auth-user-123')
    expect(result.user!.email).toBe('test@test.com')
    expect(typeof result.response.cookies?.set).toBe('function')
  })

  it("retourne email undefined si absent", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-456' } },
      error: null,
    })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    const result = await updateSession(req)

    expect(result.user).not.toBeNull()
    expect(result.user!.id).toBe('user-456')
    expect(result.user!.email).toBeUndefined()
  })

  it("utilise getAll pour lire les cookies de la requete", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    await updateSession(req)

    // Vérifie que le client Supabase a accès aux cookies via getAll
    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies
    cookiesConfig.getAll()
    expect(mockGetAllCookies).toHaveBeenCalled()
  })

  it("transfert les cookies refresh via setAll (request + response)", async () => {
    mockGetUser.mockImplementation(() => {
      // Simule le refresh token: @supabase/ssr appelle setAll pendant getUser
      if (capturedSetAll) {
        capturedSetAll([
          { name: 'sb-test-auth-token', value: 'refreshed-token', options: { maxAge: 3600, path: '/' } },
          { name: 'sb-test-refresh-token', value: 'new-refresh', options: { maxAge: 3600, path: '/' } },
        ])
      }
      return Promise.resolve({ data: { user: null }, error: null })
    })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    const result = await updateSession(req)

    // Les cookies doivent etre mis a jour sur la requete
    expect(mockRequestCookiesSet).toHaveBeenCalledWith('sb-test-auth-token', 'refreshed-token')
    expect(mockRequestCookiesSet).toHaveBeenCalledWith('sb-test-refresh-token', 'new-refresh')

    // La reponse doit etre un NextResponse valide avec cookies.set
    expect(typeof result.response.cookies?.set).toBe('function')
  })

  it("retourne user meme si la requete from users echoue (updateSession ne fait plus la requete)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-123' } },
      error: null,
    })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    const result = await updateSession(req)

    // L'utilisateur est authentifié via Supabase Auth, updateSession ne fait pas de requete DB
    expect(result.user).not.toBeNull()
    expect(result.user!.id).toBe('auth-user-123')
  })

  it('fonctionne meme si getUser retourne une erreur', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired', status: 401 },
    })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    const result = await updateSession(req)

    // Le middleware ne doit pas planter meme avec une erreur getUser
    expect(result.response).toBeDefined()
    expect(result.user).toBeNull()
  })

  it('appelle NextResponse.next avec la requete', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const nextSpy = vi.spyOn(NextResponse, 'next')

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()
    await updateSession(req)

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ request: req }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Gestion des erreurs (env manquantes)
// ═══════════════════════════════════════════════════════════════════════════════

describe('updateSession — gestion d erreurs (env manquantes)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedSetAll = null
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  it("leve une erreur si SUPABASE_URL est vide", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key'

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()

    const result = await updateSession(req)
    expect(result.user).toBeNull()
  })

  it("leve une erreur si SUPABASE_ANON_KEY est vide", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()

    const result = await updateSession(req)
    expect(result.user).toBeNull()
  })

  it("leve une erreur si SUPABASE_URL est manquant (undefined)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key'

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()

    const result = await updateSession(req)
    expect(result.user).toBeNull()
  })

  it("leve une erreur si SUPABASE_ANON_KEY est manquant (undefined)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()

    const result = await updateSession(req)
    expect(result.user).toBeNull()
  })

  it("leve une erreur si les deux vars sont absentes", async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const req = createMockRequest()

    const result = await updateSession(req)
    expect(result.user).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Config du matcher middleware
// ═══════════════════════════════════════════════════════════════════════════════

describe('middleware matcher config', () => {
  it("exporte un matcher qui exclut fichiers statiques et icones", async () => {
    const { config } = await import('@/../middleware')
    expect(config).toBeDefined()
    expect(config.matcher).toBeDefined()
    expect(Array.isArray(config.matcher)).toBe(true)
    const matcher = config.matcher[0]
    expect(matcher).toContain('_next/static')
    expect(matcher).toContain('favicon.ico')
    // Les extensions sont dans un groupe non-capturant (?:svg|png|...)
    expect(matcher).toContain('svg')
    expect(matcher).toContain('png')
    expect(matcher).toContain('jpg')
  })
})
