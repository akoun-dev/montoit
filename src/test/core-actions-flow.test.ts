import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockResolveRequestUser = vi.fn()
vi.mock('@/lib/auth/request-user', () => ({
  resolveRequestUser: (...args: any[]) => mockResolveRequestUser(...args),
}))

const mockNotify = vi.fn()
const mockNotifyMany = vi.fn()
vi.mock('@/lib/notify', () => ({
  notify: (...args: any[]) => mockNotify(...args),
  notifyMany: (...args: any[]) => mockNotifyMany(...args),
}))

vi.mock('@/lib/intouch', () => ({
  checkTransactionStatus: vi.fn().mockResolvedValue({ success: false }),
  initiateCashin: vi.fn(),
  initiatePaiement: vi.fn(),
  generatePartnerTransactionId: () => 'MT-TEST-123',
}))

vi.mock('@/lib/supabase/storage', () => ({
  BUCKETS: { PROPERTY_IMAGES: 'property-images', PROPERTY_VIDEOS: 'property-videos' },
  uploadFromBase64: vi.fn().mockResolvedValue('https://storage.test/uploaded.jpg'),
  deleteFromStorage: vi.fn().mockResolvedValue(undefined),
  isBase64DataUrl: vi.fn().mockReturnValue(false),
  guessExtensionFromMime: vi.fn().mockReturnValue('jpg'),
  extractBucketAndPath: vi.fn().mockReturnValue(null),
}))

// ─── Supabase mock ────────────────────────────────────────────────────────────

interface MockTableData {
  [tableName: string]: any[]
}

function buildMockSupabase(initialData: MockTableData = {}) {
  const tables: MockTableData = {}
  for (const [name, rows] of Object.entries(initialData)) {
    tables[name] = JSON.parse(JSON.stringify(rows))
  }

  class QueryBuilder {
    private _table: string
    private _filters: Array<{ type: string; field: string; value: any }> = []
    private _orders: Array<{ field: string; ascending: boolean }> = []
    private _limitVal: number | null = null
    private _rangeVal: [number, number] | null = null
    private _updateData: any = null
    private _countMode: boolean = false
    private _selectMode: 'single' | 'maybeSingle' | 'multiple' = 'multiple'

    constructor(table: string) {
      this._table = table
    }

    select(_fields: string, opts?: { count: 'exact'; head?: boolean }) {
      if (opts?.count === 'exact') this._countMode = true
      return this
    }

    maybeSingle() { this._selectMode = 'maybeSingle'; return this }

    single() { this._selectMode = 'single'; return this }

    count() { this._countMode = true; return this }

    eq(field: string, value: any) {
      this._filters.push({ type: 'eq', field, value }); return this
    }

    neq(field: string, value: any) {
      this._filters.push({ type: 'neq', field, value }); return this
    }

    in(field: string, values: any[]) {
      this._filters.push({ type: 'in', field, value: values }); return this
    }

    not(field: string, op: string, value: any) {
      this._filters.push({ type: 'not', field, value: { op, value } }); return this
    }

    is(field: string, value: any) {
      this._filters.push({ type: 'is', field, value }); return this
    }

    ilike(field: string, _pattern: string) {
      this._filters.push({ type: 'ilike', field, value: _pattern }); return this
    }

    gte(field: string, value: any) {
      this._filters.push({ type: 'gte', field, value }); return this
    }

    lte(field: string, value: any) {
      this._filters.push({ type: 'lte', field, value }); return this
    }

    or(_filter: string) {
      // Simplified: just pass through
      return this
    }

    order(field: string, opts?: { ascending: boolean }) {
      this._orders.push({ field, ascending: opts?.ascending ?? true }); return this
    }

    limit(n: number) { this._limitVal = n; return this }

    range(from: number, to: number) {
      this._rangeVal = [from, to]; return this
    }

    delete() {
      const rows = this._resolve()
      for (const row of rows) {
        const idx = (tables[this._table] ?? []).indexOf(row)
        if (idx >= 0) tables[this._table].splice(idx, 1)
      }
      return this
    }

    then(onfulfilled: (value: any) => void, _onrejected?: (err: any) => void) {
      try {
        const rows = this._resolve()
        if (this._selectMode === 'single') {
          if (rows.length === 0) {
            onfulfilled({ data: null, error: { code: 'PGRST116', message: 'Row not found' } })
          } else {
            onfulfilled({ data: rows[0], error: null })
          }
        } else if (this._selectMode === 'maybeSingle') {
          onfulfilled({ data: rows[0] ?? null, error: null })
        } else if (this._countMode) {
          onfulfilled({ data: rows, count: rows.length, error: null })
        } else {
          onfulfilled({ data: rows, error: null })
        }
      } catch (err) {
        if (_onrejected) _onrejected(err)
        else throw err
      }
    }

    insert(data: any) {
      if (!tables[this._table]) tables[this._table] = []
      const rows = Array.isArray(data) ? data : [data]
      const now = new Date().toISOString()
      let first: any = null
      for (const item of rows) {
        const enriched = { ...item }
        // Default values that real Supabase DB provides
        if (enriched.created_at === undefined) enriched.created_at = now
        if (enriched.updated_at === undefined) enriched.updated_at = now
        if (this._table === 'visit_requests' && enriched.status === undefined) enriched.status = 'PENDING'
        if (this._table === 'properties' && enriched.status === undefined) enriched.status = 'DRAFT'
        if (this._table === 'rental_files' && enriched.status === undefined) enriched.status = 'DRAFT'
        if (this._table === 'applications' && enriched.status === undefined) enriched.status = 'DRAFT'
        if (this._table === 'payments' && enriched.status === undefined) enriched.status = 'PENDING'
        tables[this._table].push(enriched)
        if (first === null) first = { ...enriched }
      }
      return {
        select: () => ({
          single: () => ({ data: first, error: null }),
          maybeSingle: () => ({ data: first, error: null }),
        }),
      }
    }

    update(data: any) { this._updateData = data; return this }

    private _resolve(): any[] {
      let rows = tables[this._table] ?? []

      for (const f of this._filters) {
        if (f.type === 'eq') {
          rows = rows.filter((r: any) => r[f.field] === f.value)
        } else if (f.type === 'neq') {
          rows = rows.filter((r: any) => r[f.field] !== f.value)
        } else if (f.type === 'in') {
          rows = rows.filter((r: any) => (f.value as any[]).includes(r[f.field]))
        } else if (f.type === 'not') {
          const { op, value } = f.value
          if (op === 'eq') rows = rows.filter((r: any) => r[f.field] !== value)
        } else if (f.type === 'is') {
          if (f.value === null) rows = rows.filter((r: any) => r[f.field] === null)
        } else if (f.type === 'gte') {
          rows = rows.filter((r: any) => r[f.field] >= f.value)
        } else if (f.type === 'lte') {
          rows = rows.filter((r: any) => r[f.field] <= f.value)
        }
      }

      for (const ord of this._orders) {
        rows.sort((a: any, b: any) => {
          const va = a[ord.field] ?? ''
          const vb = b[ord.field] ?? ''
          return ord.ascending ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
        })
      }

      if (this._updateData) {
        for (const row of rows) {
          Object.assign(row, JSON.parse(JSON.stringify(this._updateData)))
        }
      }

      if (this._limitVal !== null) {
        rows = rows.slice(0, this._limitVal)
      }
      if (this._rangeVal) {
        const [from, to] = this._rangeVal
        rows = rows.slice(from, to + 1)
      }

      return rows
    }
  }

  return {
    from: (table: string) => new QueryBuilder(table),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    getTable: (name: string) => tables[name] ?? [],
    getTables: () => tables,
  }
}

let currentMockSupabase: ReturnType<typeof buildMockSupabase>

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => currentMockSupabase,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createNextRequest(url: string, options?: { method?: string; body?: any }) {
  const { method = 'GET', body } = options ?? {}
  const applyCookies = (resp: any) => resp
  return {
    url,
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue(body ?? {}),
    cookies: { getAll: () => [], get: () => undefined },
    nextUrl: new URL(url, 'http://localhost:3000'),
    applyCookies,
  } as unknown as NextRequest
}

// ─── Shared test IDs ──────────────────────────────────────────────────────────

const USER_ID_PROP = 'prop-123'
const USER_ID_TENANT = 'tenant-123'
const USER_ID_TC = 'tc-123'
const USER_ID_AGENCE = 'agence-123'
const PROP_ID = 'property-1'
const LEASE_ID = 'lease-1'
const APP_ID = 'app-1'
const VISIT_ID = 'visit-1'
const PAYMENT_ID = 'payment-1'

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: PROPERTIES (Biens)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Properties — POST /api/properties (création de bien)', () => {
  const validBody = {
    title: 'Bel appartement F4',
    description: 'Très bel appartement au coeur du Plateau',
    type: 'APPARTEMENT',
    price: 500000,
    area: 120,
    bedrooms: 3,
    bathrooms: 2,
    address: 'Rue des Jardins',
    city: 'Abidjan',
    commune: 'Plateau',
    isFurnished: true,
    hasParking: true,
    images: ['https://img.test/photo1.jpg'],
  }

  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('crée un bien PENDING_VERIFICATION avec toutes les infos valides', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_TC, role: 'TIERS_CONFIANCE', is_active: true },
      ],
      properties: [],
      property_images: [],
      audit_logs: [],
      notifications: [],
    })

    const { POST } = await import('@/app/api/properties/route')
    const req = createNextRequest('http://localhost:3000/api/properties', {
      method: 'POST', body: validBody,
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(201)
    expect(json.property).toBeDefined()
    expect(json.property.status).toBe('PENDING_VERIFICATION')
    expect(json.property.title).toBe('Bel appartement F4')
    expect(json.property.price).toBe(500000)
    expect(json.property.type).toBe('APPARTEMENT')

    // Vérifier que le bien est dans la table
    const props = currentMockSupabase.getTable('properties')
    expect(props).toHaveLength(1)
    expect(props[0].status).toBe('PENDING_VERIFICATION')
    expect(props[0].owner_id).toBe(USER_ID_PROP)
  })

  it('rejette un bien avec titre manquant', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
    })

    const { POST } = await import('@/app/api/properties/route')
    const req = createNextRequest('http://localhost:3000/api/properties', {
      method: 'POST', body: { ...validBody, title: '' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('titre')
  })

  it('rejette un bien sans prix', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
    })

    const { POST } = await import('@/app/api/properties/route')
    const req = createNextRequest('http://localhost:3000/api/properties', {
      method: 'POST', body: { ...validBody, price: undefined },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('prix')
  })

  it('accepte un bien en mode DRAFT (sans validation)', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [],
    })

    const { POST } = await import('@/app/api/properties/route')
    const req = createNextRequest('http://localhost:3000/api/properties', {
      method: 'POST', body: { draft: true },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(201)
    expect(json.property.status).toBe('DRAFT')
  })

  it('refuse la création si rôle = LOCATAIRE', async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
    })

    const { POST } = await import('@/app/api/properties/route')
    const req = createNextRequest('http://localhost:3000/api/properties', {
      method: 'POST', body: validBody,
    })
    const resp = await POST(req)

    expect(resp.status).toBe(403)
  })

  it('refuse la création si non authentifié', async () => {
    mockResolveRequestUser.mockResolvedValue(null)

    const { POST } = await import('@/app/api/properties/route')
    const req = createNextRequest('http://localhost:3000/api/properties', {
      method: 'POST', body: validBody,
    })
    const resp = await POST(req)

    expect(resp.status).toBe(401)
  })

  it('limite le nombre d\'images à 10', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
    })

    const { POST } = await import('@/app/api/properties/route')
    const manyImages = Array.from({ length: 11 }, (_, i) => `https://img.test/photo${i}.jpg`)
    const req = createNextRequest('http://localhost:3000/api/properties', {
      method: 'POST', body: { ...validBody, images: manyImages },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('Maximum')
  })

  it('notifie les admins et TC lors de la création d\'un bien PENDING_VERIFICATION', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: 'admin-1', role: 'ADMIN', is_active: true },
        { id: USER_ID_TC, role: 'TIERS_CONFIANCE', is_active: true },
      ],
      properties: [],
      property_images: [],
    })

    const { POST } = await import('@/app/api/properties/route')
    const req = createNextRequest('http://localhost:3000/api/properties', {
      method: 'POST', body: validBody,
    })
    await POST(req)

    // Wait for the fire-and-forget notifyNewProperty to complete
    await vi.waitFor(() => {
      expect(mockNotifyMany).toHaveBeenCalled()
    }, { timeout: 2000 })
    const call = mockNotifyMany.mock.calls[0][0]
    expect(call.type).toBe('PROPERTY_VERIFICATION')
    expect(call.userIds).toContain(USER_ID_TC)
  })
})

describe('Properties — PATCH /api/properties/[id] (mise à jour)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('met à jour les champs d\'un bien existant', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, status: 'DRAFT',
        title: 'Ancien titre', price: 300000, area: 80,
        description: '', type: 'STUDIO', address: '', city: '',
        created_at: '', updated_at: '',
      }],
      property_images: [],
    })

    const { PATCH } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/${PROP_ID}`, {
      method: 'PATCH',
      body: { title: 'Nouveau titre', price: 450000 },
    })
    const resp = await PATCH(req, { params: Promise.resolve({ id: PROP_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.property.title).toBe('Nouveau titre')
    expect(json.property.price).toBe(450000)
  })

  it('publie un DRAFT → PENDING_VERIFICATION avec validation des champs', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, status: 'DRAFT',
        title: 'Mon bien', description: 'Description',
        price: 400000, area: 100, type: 'APPARTEMENT',
        address: 'Adresse', city: 'Ville',
        created_at: '', updated_at: '',
      }],
      property_images: [],
    })

    const { PATCH } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/${PROP_ID}`, {
      method: 'PATCH',
      body: { status: 'ACTIVE' },
    })
    const resp = await PATCH(req, { params: Promise.resolve({ id: PROP_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.property.status).toBe('PENDING_VERIFICATION')
    // Aucun tiers de confiance n'est présent dans ce fixture.
    expect(mockNotifyMany).not.toHaveBeenCalled()
  })

  it('rejette la publication si titre manquant', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, status: 'DRAFT',
        title: '', description: '', price: 0, area: 0,
        address: '', city: '',
        created_at: '', updated_at: '',
      }],
      property_images: [],
    })

    const { PATCH } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/${PROP_ID}`, {
      method: 'PATCH',
      body: { status: 'ACTIVE' },
    })
    const resp = await PATCH(req, { params: Promise.resolve({ id: PROP_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('titre')
  })

  it('retourne 404 si le bien n\'existe pas', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [],
    })

    const { PATCH } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/unknown`, {
      method: 'PATCH',
      body: { title: 'Test' },
    })
    const resp = await PATCH(req, { params: Promise.resolve({ id: 'unknown' }) })

    expect(resp.status).toBe(404)
  })

  it('retourne 403 si on n\'est pas le propriétaire', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [{
        id: PROP_ID, owner_id: 'other-owner', status: 'DRAFT',
        title: '', description: '', price: 0, area: 0,
        address: '', city: '',
        created_at: '', updated_at: '',
      }],
    })

    const { PATCH } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/${PROP_ID}`, {
      method: 'PATCH',
      body: { title: 'Test' },
    })
    const resp = await PATCH(req, { params: Promise.resolve({ id: PROP_ID }) })

    expect(resp.status).toBe(403)
  })
})

describe('Properties — DELETE /api/properties/[id] (suppression)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('supprime son propre bien', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, status: 'DRAFT',
      }],
      property_images: [],
    })

    const { DELETE } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/${PROP_ID}`, { method: 'DELETE' })
    const resp = await DELETE(req, { params: Promise.resolve({ id: PROP_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.success).toBe(true)
    expect(currentMockSupabase.getTable('properties')).toHaveLength(0)
  })

  it('retourne 404 si le bien n\'existe pas', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [],
    })

    const { DELETE } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/unknown`, { method: 'DELETE' })
    const resp = await DELETE(req, { params: Promise.resolve({ id: 'unknown' }) })

    expect(resp.status).toBe(404)
  })

  it('retourne 403 si le bien ne vous appartient pas', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      properties: [{ id: PROP_ID, owner_id: 'other-owner', status: 'DRAFT' }],
    })

    const { DELETE } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/${PROP_ID}`, { method: 'DELETE' })
    const resp = await DELETE(req, { params: Promise.resolve({ id: PROP_ID }) })

    expect(resp.status).toBe(403)
  })
})

describe('Properties — GET /api/properties/[id] (consultation)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('retourne un bien ACTIVE visible par tout le monde', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [{
        id: PROP_ID, owner_id: 'other-owner', status: 'ACTIVE',
        title: 'Beau Studio', description: 'Super studio', type: 'STUDIO',
        price: 150000, area: 30,
        address: 'Address', city: 'City',
        created_at: '', updated_at: '',
        views_count: 5,
      }],
      property_images: [],
    })

    const { GET } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/${PROP_ID}`)
    const resp = await GET(req, { params: Promise.resolve({ id: PROP_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.property.title).toBe('Beau Studio')
    expect(json.property.status).toBe('ACTIVE')
  })

  it('retourne 403 pour un bien non-ACTIVE si non propriétaire/TC', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [{
        id: PROP_ID, owner_id: 'other-owner', status: 'DRAFT',
        title: 'Brouillon', description: '', type: 'STUDIO',
        price: 0, area: 0, address: '', city: '',
        created_at: '', updated_at: '',
      }],
    })

    const { GET } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/${PROP_ID}`)
    const resp = await GET(req, { params: Promise.resolve({ id: PROP_ID }) })

    expect(resp.status).toBe(403)
  })

  it('retourne 404 si le bien n\'existe pas', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [],
    })

    const { GET } = await import('@/app/api/properties/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/unknown`)
    const resp = await GET(req, { params: Promise.resolve({ id: 'unknown' }) })

    expect(resp.status).toBe(404)
  })
})

describe('Properties — POST /api/properties/signal (signaler un bien)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('crée un signalement valide et notifie les admins', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' },
        { id: 'admin-1', role: 'ADMIN', is_active: true, first_name: 'Admin', last_name: 'Test' },
      ],
      properties: [{
        id: PROP_ID, title: 'Bien frauduleux', owner_id: 'other-owner', status: 'ACTIVE',
      }],
      signalements: [],
      audit_logs: [],
      notifications: [],
    })

    const { POST } = await import('@/app/api/properties/signal/route')
    const req = createNextRequest('http://localhost:3000/api/properties/signal', {
      method: 'POST',
      body: {
        propertyId: PROP_ID,
        reason: 'Annonce frauduleuse',
        description: 'Ce bien semble être une arnaque.',
      },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.message).toContain('signalement')

    // Vérifier le signalement créé
    const signalements = currentMockSupabase.getTable('signalements')
    expect(signalements).toHaveLength(1)
    expect(signalements[0].entity_type).toBe('PROPERTY')
    expect(signalements[0].entity_id).toBe(PROP_ID)
    expect(signalements[0].reporter_id).toBe(USER_ID_TENANT)

    // Vérifier l'audit log
    const auditLogs = currentMockSupabase.getTable('audit_logs')
    expect(auditLogs.some((l: any) => l.action === 'SIGNALEMENT_CREATED')).toBe(true)

    // Vérifier la notification admin
    expect(mockNotify).toHaveBeenCalled()
    const notifCall = mockNotify.mock.calls[0][0]
    expect(notifCall.userId).toBe('admin-1')
  })

  it('rejette si propertyId manquant', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [],
    })

    const { POST } = await import('@/app/api/properties/signal/route')
    const req = createNextRequest('http://localhost:3000/api/properties/signal', {
      method: 'POST',
      body: { reason: 'Fraude', description: 'Test' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('Identifiant')
  })

  it('rejette si raison manquante', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [{ id: PROP_ID, status: 'ACTIVE' }],
    })

    const { POST } = await import('@/app/api/properties/signal/route')
    const req = createNextRequest('http://localhost:3000/api/properties/signal', {
      method: 'POST',
      body: { propertyId: PROP_ID, description: 'Test' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('raison')
  })

  it('retourne 404 si le bien n\'existe pas', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [],
    })

    const { POST } = await import('@/app/api/properties/signal/route')
    const req = createNextRequest('http://localhost:3000/api/properties/signal', {
      method: 'POST',
      body: { propertyId: 'unknown', reason: 'Fraude', description: 'Test' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: APPLICATIONS (Candidatures)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Applications — POST /api/applications (candidature)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('crée une candidature valide pour un bien libre', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, rental_status: 'libre',
        title: 'Appartement F3', address: 'Adresse', city: 'Abidjan',
        type: 'APPARTEMENT', price: 300000, currency: 'XOF',
      }],
      rental_files: [],
      rental_file_documents: [],
      applications: [],
      property_images: [],
      notifications: [],
      audit_logs: [],
    })

    const { POST } = await import('@/app/api/applications/route')
    const req = createNextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: { propertyId: PROP_ID },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data.status).toBe('SUBMITTED')
    expect(json.data.propertyId).toBe(PROP_ID)
    expect(json.data.property).toBeDefined()
    expect(json.data.property.title).toBe('Appartement F3')

    // Le dossier reste un brouillon jusqu'à la soumission explicite des pièces.
    const rentalFiles = currentMockSupabase.getTable('rental_files')
    expect(rentalFiles.length).toBeGreaterThan(0)
    expect(rentalFiles[0].status).toBe('DRAFT')

    // La notification est envoyée seulement si le dossier est déjà validé.
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('rejette si déjà candidaté (status = SUBMITTED)', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, rental_status: 'libre' }],
      applications: [{
        id: 'existing-app', tenant_id: USER_ID_TENANT,
        property_id: PROP_ID, status: 'SUBMITTED',
      }],
      rental_files: [],
    })

    const { POST } = await import('@/app/api/applications/route')
    const req = createNextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: { propertyId: PROP_ID },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(409)
    expect(json.error).toContain('déjà candidaté')
  })

  it('rejette si le bien est déjà loué', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, rental_status: 'loue' }],
    })

    const { POST } = await import('@/app/api/applications/route')
    const req = createNextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: { propertyId: PROP_ID },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('déjà loué')
  })

  it('rejette si propertyId manquant', async () => {
    const { POST } = await import('@/app/api/applications/route')
    const req = createNextRequest('http://localhost:3000/api/applications', {
      method: 'POST', body: {},
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('propertyId')
  })
})

describe('Applications — GET /api/applications (liste)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('retourne la liste des candidatures du locataire', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      applications: [{
        id: APP_ID, tenant_id: USER_ID_TENANT, property_id: PROP_ID,
        rental_file_id: 'rf-1', status: 'SUBMITTED',
        created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
      }],
      rental_files: [{ id: 'rf-1', tenant_id: USER_ID_TENANT }],
      rental_file_documents: [],
      leases: [],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Appart',
        address: 'Address', city: 'Ville', type: 'APPARTEMENT',
        price: 300000, currency: 'XOF',
      }],
      property_images: [],
    })

    const { GET } = await import('@/app/api/applications/route')
    const req = createNextRequest('http://localhost:3000/api/applications')
    const resp = await GET(req)

    // Handle possible 403 — check if the profile query returned data correctly
    if (resp.status !== 200) {
      const body = await resp.json()
      console.error('Applications GET failed:', resp.status, JSON.stringify(body))
    }
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe(APP_ID)
    expect(json.data[0].status).toBe('SUBMITTED')
    expect(json.data[0].linkedProperty).toBeDefined()
    expect(json.data[0].linkedProperty).not.toBeNull()
    expect(json.data[0].linkedProperty.title).toBe('Bel Appart')
  })

  it('retourne la timeline avec REJECTED si rejeté', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      applications: [{
        id: APP_ID, tenant_id: USER_ID_TENANT, property_id: PROP_ID,
        rental_file_id: 'rf-1', status: 'REJECTED',
        created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
      }],
      rental_files: [{ id: 'rf-1', tenant_id: USER_ID_TENANT }],
      rental_file_documents: [],
      leases: [],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP }],
    })

    const { GET } = await import('@/app/api/applications/route')
    const req = createNextRequest('http://localhost:3000/api/applications')
    const resp = await GET(req)
    const json = await resp.json()

    expect(json.data[0].statusTimeline.some((s: any) => s.status === 'REJECTED' && s.active)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: VISITS (Visites)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Visits — POST /api/visits (création)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('crée une demande de visite valide', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE', first_name: 'Jean', last_name: 'Dupont' },
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
      ],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, rental_status: 'libre',
        title: 'Bel Appartement',
      }],
      visit_requests: [],
      property_images: [],
      notifications: [],
    })

    const { POST } = await import('@/app/api/visits/route')
    const req = createNextRequest('http://localhost:3000/api/visits', {
      method: 'POST',
      body: {
        propertyId: PROP_ID,
        requestedDate: '2026-06-15T10:00:00Z',
        timeSlot: '10:00-11:00',
        tenantMessage: 'Disponible le matin',
      },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(201)
    // The enrichedVisit adds camelCase fields like visitType, not status directly
    expect(json.data.visitType).toBe('PHYSICAL')
    expect(json.data.propertyId).toBe(PROP_ID)
    expect(json.data.tenantId).toBe(USER_ID_TENANT)
    // status should be present from the insert default
    expect(json.data.status).toBeDefined()

    // La notification dépend d'un dossier locataire validé.
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('rejette si une demande PENDING existe déjà pour ce bien', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, rental_status: 'libre' }],
      visit_requests: [{
        id: 'existing-visit', property_id: PROP_ID,
        tenant_id: USER_ID_TENANT, status: 'PENDING',
      }],
    })

    const { POST } = await import('@/app/api/visits/route')
    const req = createNextRequest('http://localhost:3000/api/visits', {
      method: 'POST',
      body: { propertyId: PROP_ID, requestedDate: '2026-06-15', timeSlot: '10:00' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(409)
    expect(json.error).toContain('déjà une demande')
  })

  it('rejette si le bien est déjà loué', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, rental_status: 'loue' }],
      visit_requests: [],
    })

    const { POST } = await import('@/app/api/visits/route')
    const req = createNextRequest('http://localhost:3000/api/visits', {
      method: 'POST',
      body: { propertyId: PROP_ID, requestedDate: '2026-06-15', timeSlot: '10:00' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('déjà loué')
  })

  it('rejette si champs requis manquants', async () => {
    const { POST } = await import('@/app/api/visits/route')
    const req = createNextRequest('http://localhost:3000/api/visits', {
      method: 'POST', body: {},
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('propertyId')
  })
})

describe('Visits — PATCH /api/visits/[id] (actions)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Propriétaire accepte/rejette/contre-propose', () => {
    beforeEach(() => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_PROP,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
    })

    it('accepte une visite', async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
          { id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' },
        ],
        properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Appart' }],
        visit_requests: [{
          id: VISIT_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          status: 'PENDING', requested_date: '2026-06-15T10:00:00Z',
          time_slot: '10:00-11:00', created_at: '', updated_at: '',
        }],
        rental_files: [{ id: 'rf-1', tenant_id: USER_ID_TENANT, status: 'VALIDATED' }],
        property_images: [],
        notifications: [],
      })

      const { PATCH } = await import('@/app/api/visits/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/visits/${VISIT_ID}`, {
        method: 'PATCH',
        body: { status: 'ACCEPTED' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: VISIT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.status).toBe('ACCEPTED')
      // Notification au locataire
      expect(mockNotify).toHaveBeenCalled()
      expect(mockNotify.mock.calls[0][0].userId).toBe(USER_ID_TENANT)
    })

    it('rejette une visite', async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
          { id: USER_ID_TENANT },
        ],
        properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Appart' }],
        visit_requests: [{
          id: VISIT_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          status: 'PENDING', requested_date: '2026-06-15T10:00:00Z',
          time_slot: '10:00-11:00', created_at: '', updated_at: '',
        }],
        rental_files: [{ id: 'rf-1', tenant_id: USER_ID_TENANT, status: 'VALIDATED' }],
        property_images: [],
      })

      const { PATCH } = await import('@/app/api/visits/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/visits/${VISIT_ID}`, {
        method: 'PATCH',
        body: { status: 'REJECTED', ownerComment: 'Pas disponible à cette date' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: VISIT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.status).toBe('REJECTED')
      expect(json.data.ownerComment).toBe('Pas disponible à cette date')
    })

    it('contre-propose une visite', async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
          { id: USER_ID_TENANT },
        ],
        properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Appart' }],
        visit_requests: [{
          id: VISIT_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          status: 'PENDING', requested_date: '2026-06-15T10:00:00Z',
          time_slot: '10:00-11:00', created_at: '', updated_at: '',
        }],
        rental_files: [{ id: 'rf-1', tenant_id: USER_ID_TENANT, status: 'VALIDATED' }],
        property_images: [],
      })

      const { PATCH } = await import('@/app/api/visits/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/visits/${VISIT_ID}`, {
        method: 'PATCH',
        body: {
          status: 'COUNTER_PROPOSED',
          counterDate: '2026-06-16T14:00:00Z',
          counterTimeSlot: '14:00-15:00',
        },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: VISIT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.status).toBe('COUNTER_PROPOSED')
      expect(json.data.counterTimeSlot).toBe('14:00-15:00')
    })
  })

  describe('Locataire annule ou évalue', () => {
    beforeEach(() => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_TENANT,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
    })

    it('annule une visite en statut PENDING', async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' },
        ],
        properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Appart' }],
        visit_requests: [{
          id: VISIT_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          status: 'PENDING', requested_date: '2026-06-15T10:00:00Z',
          time_slot: '10:00-11:00', created_at: '', updated_at: '',
        }],
        property_images: [],
        notifications: [],
      })

      const { PATCH } = await import('@/app/api/visits/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/visits/${VISIT_ID}`, {
        method: 'PATCH',
        body: { status: 'CANCELLED' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: VISIT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.status).toBe('CANCELLED')
    })

    it('évalue une visite terminée (note + commentaire)', async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' },
        ],
        visit_requests: [{
          id: VISIT_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          status: 'COMPLETED', requested_date: '2026-06-15T10:00:00Z',
          time_slot: '10:00-11:00', created_at: '', updated_at: '',
        }],
        property_images: [],
      })

      const { PATCH } = await import('@/app/api/visits/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/visits/${VISIT_ID}`, {
        method: 'PATCH',
        body: { tenantRating: 4, tenantReview: 'Très bon appartement !' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: VISIT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.tenantRating).toBe(4)
      expect(json.data.tenantReview).toBe('Très bon appartement !')
    })

    it('rejette une note en dehors de 1-5', async () => {
      currentMockSupabase = buildMockSupabase({
        users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
        visit_requests: [{
          id: VISIT_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          status: 'COMPLETED', requested_date: '2026-06-15T10:00:00Z',
          time_slot: '10:00-11:00', created_at: '', updated_at: '',
        }],
        property_images: [],
      })

      const { PATCH } = await import('@/app/api/visits/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/visits/${VISIT_ID}`, {
        method: 'PATCH',
        body: { tenantRating: 6 },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: VISIT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(400)
      expect(json.error).toContain('note')
    })
  })
})

describe('Visits — GET /api/visits (liste)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('retourne les visites du locataire', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE', first_name: 'Jean', last_name: 'Dupont' }],
      visit_requests: [{
        id: VISIT_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
        status: 'COMPLETED', requested_date: '2026-06-15T10:00:00Z',
        time_slot: '10:00-11:00', tenant_message: null,
        created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
      }],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Appart',
        address: 'Address', city: 'Ville', type: 'APPARTEMENT',
        price: 300000, currency: 'XOF',
      }],
      property_images: [],
    })

    const { GET } = await import('@/app/api/visits/route')
    const req = createNextRequest('http://localhost:3000/api/visits')
    const resp = await GET(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].status).toBe('COMPLETED')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: REVIEWS (Avis)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Reviews — GET /api/properties/reviews', () => {
  it('retourne les avis et la moyenne pour un bien', async () => {
    currentMockSupabase = buildMockSupabase({
      leases: [{
        id: LEASE_ID, property_id: PROP_ID, status: 'ACTIVE',
      }],
      ratings: [
        { id: 'r1', lease_id: LEASE_ID, from_user_id: USER_ID_TENANT, score: 5, comment: 'Excellent !', created_at: '2026-06-01T00:00:00Z' },
        { id: 'r2', lease_id: LEASE_ID, from_user_id: 'other-tenant', score: 4, comment: 'Très bien', created_at: '2026-06-01T00:00:00Z' },
      ],
      users: [
        { id: USER_ID_TENANT, first_name: 'Jean', last_name: 'Dupont', avatar_url: null },
        { id: 'other-tenant', first_name: 'Marie', last_name: 'Koné', avatar_url: null },
      ],
    })

    const { GET } = await import('@/app/api/properties/reviews/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/reviews?propertyId=${PROP_ID}`)
    const resp = await GET(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.reviews).toHaveLength(2)
    expect(json.totalReviews).toBe(2)
    expect(json.avgRating).toBe(4.5) // (5+4)/2
    expect(json.reviews[0].name).toBe('Jean Dupont')
    expect(json.reviews[1].name).toBe('Marie Koné')
  })

  it('retourne tableau vide si aucun bail actif/expiré', async () => {
    currentMockSupabase = buildMockSupabase({
      leases: [],
      ratings: [],
      users: [],
    })

    const { GET } = await import('@/app/api/properties/reviews/route')
    const req = createNextRequest(`http://localhost:3000/api/properties/reviews?propertyId=${PROP_ID}`)
    const resp = await GET(req)
    const json = await resp.json()

    expect(json.reviews).toEqual([])
    expect(json.avgRating).toBe(0)
    expect(json.totalReviews).toBe(0)
  })

  it('rejette si propertyId manquant', async () => {
    const { GET } = await import('@/app/api/properties/reviews/route')
    const req = createNextRequest('http://localhost:3000/api/properties/reviews')
    const resp = await GET(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('propertyId')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: PAYMENTS (Paiements)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Payments — GET /api/payments (liste)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('retourne les paiements du locataire avec stats', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      payments: [{
        id: PAYMENT_ID, tenant_id: USER_ID_TENANT, lease_id: LEASE_ID,
        amount: 300000, status: 'PAID', method: 'ORANGE_MONEY',
        due_date: '2026-06-01T00:00:00Z', paid_at: '2026-06-01T00:00:00Z',
        created_at: '2026-05-25T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
        reference: 'REF-001', operator_transaction_id: null,
        operator_phone_number: '0102030405', payment_operator_data: null,
      }],
      leases: [{
        id: LEASE_ID, tenant_id: USER_ID_TENANT, owner_id: USER_ID_PROP,
        property_id: PROP_ID, status: 'ACTIVE', start_date: '2026-06-01',
        end_date: '2027-06-01', monthly_rent: 300000,
        charges: null, deposit: null, special_conditions: null,
        owner_signed_at: null, tenant_signed_at: null,
        created_at: '2026-05-25T00:00:00Z',
      }],
      properties: [{
        id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Appart',
        address: 'Adresse', city: 'Ville', type: 'APPARTEMENT',
        price: 300000, currency: 'XOF',
      }],
      property_images: [],
    })

    const { GET } = await import('@/app/api/payments/route')
    const req = createNextRequest('http://localhost:3000/api/payments')
    const resp = await GET(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].status).toBe('PAID')
    expect(json.data[0].amount).toBe(300000)
    expect(json.stats.totalPaid).toBe(300000)
    expect(json.stats.paidCount).toBe(1)
    expect(json.stats.methodDistribution).toEqual({ ORANGE_MONEY: 1 })
  })

  it('filtre par statut', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      payments: [
        { id: 'p1', tenant_id: USER_ID_TENANT, lease_id: LEASE_ID, amount: 300000, status: 'PAID', due_date: '2026-06-01', created_at: '', updated_at: '' },
        { id: 'p2', tenant_id: USER_ID_TENANT, lease_id: LEASE_ID, amount: 300000, status: 'PENDING', due_date: '2026-07-01', created_at: '', updated_at: '' },
      ],
      leases: [{ id: LEASE_ID, tenant_id: USER_ID_TENANT, owner_id: USER_ID_PROP, property_id: PROP_ID, status: 'ACTIVE', start_date: '2026-06-01', end_date: '2027-06-01', monthly_rent: 300000 }],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Test' }],
      property_images: [],
    })

    const { GET } = await import('@/app/api/payments/route')
    const req = createNextRequest('http://localhost:3000/api/payments?status=PAID')
    const resp = await GET(req)
    const json = await resp.json()

    expect(json.data).toHaveLength(1)
    expect(json.data[0].status).toBe('PAID')
  })
})

describe('Payments — PUT /api/payments/[id] (confirmation réception)', () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('confirme la réception d\'un paiement PAID', async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      leases: [{
        id: LEASE_ID, owner_id: USER_ID_PROP, tenant_id: USER_ID_TENANT,
        property_id: PROP_ID, status: 'ACTIVE',
      }],
      payments: [{
        id: PAYMENT_ID, lease_id: LEASE_ID, tenant_id: USER_ID_TENANT,
        amount: 300000, status: 'PAID', payment_operator_data: {},
      }],
      notifications: [],
    })

    const { PUT } = await import('@/app/api/payments/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/payments/${PAYMENT_ID}`, {
      method: 'PUT',
      body: { action: 'confirm_receipt' },
    })
    const resp = await PUT(req, { params: Promise.resolve({ id: PAYMENT_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.message).toContain('confirmée')
    // Notification au locataire
    expect(mockNotify).toHaveBeenCalled()
    expect(mockNotify.mock.calls[0][0].userId).toBe(USER_ID_TENANT)
  })

  it('rejette si rôle != PROPRIETAIRE', async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })

    const { PUT } = await import('@/app/api/payments/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/payments/${PAYMENT_ID}`, {
      method: 'PUT',
      body: { action: 'confirm_receipt' },
    })
    const resp = await PUT(req, { params: Promise.resolve({ id: PAYMENT_ID }) })

    expect(resp.status).toBe(404)
  })
})
