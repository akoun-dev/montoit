import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  notifyNewLease: vi.fn().mockResolvedValue(undefined),
  notifyLeaseActivated: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/generate-and-upload-lease-pdf', () => ({
  generateAndUploadLeasePdf: vi.fn().mockResolvedValue('https://storage.test/leases/lease.pdf'),
}))

vi.mock('@/lib/generate-and-upload-mandat-pdf', () => ({
  generateAndUploadMandatPdf: vi.fn().mockResolvedValue('https://storage.test/mandats/mandat.pdf'),
}))

vi.mock('@/lib/supabase/storage', () => ({
  BUCKETS: {
    PROPERTY_IMAGES: 'property-images',
    PROPERTY_VIDEOS: 'property-videos',
    OWNER_DOCUMENTS: 'owner-documents',
    RENTAL_DOCUMENTS: 'rental-documents',
    LEASE_DOCUMENTS: 'lease-documents',
    MANDAT_DOCUMENTS: 'mandat-documents',
  },
  uploadFromBase64: vi.fn().mockResolvedValue('https://storage.test/uploaded/doc.pdf'),
  deleteFromStorage: vi.fn().mockResolvedValue(undefined),
  isBase64DataUrl: vi.fn().mockReturnValue(false),
  guessExtensionFromMime: vi.fn().mockReturnValue('pdf'),
  extractBucketAndPath: vi.fn().mockImplementation((url: string) => {
    if (url.startsWith('http') && url.includes('/storage/v1/object/public/')) {
      const parts = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
      if (parts) return { bucket: parts[1], path: parts[2] }
    }
    return null
  }),
}))

vi.mock('@/lib/generate-bail', () => ({
  generateBailContract: vi.fn().mockResolvedValue(Buffer.from('mock-docx-content')),
}))

vi.mock('@/lib/lease-financials', () => ({
  getLeaseMonthlyRent: vi.fn((rent, price) => rent || price || 0),
  getLeaseDepositAmount: vi.fn((rent) => Math.round(rent * 1)),
  getLeaseAdvanceRentAmount: vi.fn((rent) => Math.round(rent * 2)),
  getLeaseAdvanceMonthLabels: vi.fn(() => ['Juin 2026', 'Juillet 2026']),
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
    private _selectMode: 'single' | 'maybeSingle' | 'multiple' = 'multiple'
    private _orFilter: string | null = null

    constructor(table: string) {
      this._table = table
    }

    select(_fields?: string, opts?: { count: 'exact'; head?: boolean }) {
      return this
    }

    maybeSingle() { this._selectMode = 'maybeSingle'; return this }

    single() { this._selectMode = 'single'; return this }

    eq(field: string, value: any) {
      this._filters.push({ type: 'eq', field, value }); return this
    }

    neq(field: string, value: any) {
      this._filters.push({ type: 'neq', field, value }); return this
    }

    in(field: string, values: any[]) {
      this._filters.push({ type: 'in', field, value: values }); return this
    }

    is(field: string, value: any) {
      this._filters.push({ type: 'is', field, value }); return this
    }

    gte(field: string, value: any) {
      this._filters.push({ type: 'gte', field, value }); return this
    }

    lte(field: string, value: any) {
      this._filters.push({ type: 'lte', field, value }); return this
    }

    or(filter: string) { this._orFilter = filter; return this }

    order(field: string, opts?: { ascending: boolean }) {
      this._orders.push({ field, ascending: opts?.ascending ?? true }); return this
    }

    limit(n: number) { this._limitVal = n; return this }

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
        if (this._updateData) {
          this._updateData = null
          if (this._selectMode === 'single') {
            onfulfilled({ data: rows[0] ?? null, error: rows.length === 0 ? { code: 'PGRST116', message: 'Row not found' } : null })
          } else if (this._selectMode === 'maybeSingle') {
            onfulfilled({ data: rows[0] ?? null, error: null })
          } else {
            onfulfilled({ data: rows, error: null })
          }
          return
        }
        if (this._selectMode === 'single') {
          if (rows.length === 0) {
            onfulfilled({ data: null, error: { code: 'PGRST116', message: 'Row not found' } })
          } else {
            onfulfilled({ data: rows[0], error: null })
          }
        } else if (this._selectMode === 'maybeSingle') {
          onfulfilled({ data: rows[0] ?? null, error: null })
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
        if (enriched.created_at === undefined) enriched.created_at = now
        if (enriched.updated_at === undefined) enriched.updated_at = now
        if (this._table === 'owner_file_documents' && enriched.status === undefined) enriched.status = 'PENDING'
        if (this._table === 'rental_file_documents' && enriched.status === undefined) enriched.status = 'PENDING'
        if (this._table === 'mandats' && enriched.status === undefined) enriched.status = 'DRAFT'
        if (this._table === 'leases' && enriched.status === undefined) enriched.status = 'PENDING_SIGNATURE'
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

      // Apply .or() filter if present
      if (this._orFilter) {
        const conditions = this._orFilter.split(',')
        rows = rows.filter((r: any) => {
          return conditions.some((cond) => {
            const parts = cond.match(/^([^._][^.]+)\.([^._][^.]+)\.(.+)$/)
            if (!parts) return false
            const [, field, op, val] = parts
            if (op === 'eq') return String(r[field]) === val
            return false
          })
        })
      }

      for (const f of this._filters) {
        if (f.type === 'eq') {
          rows = rows.filter((r: any) => r[f.field] === f.value)
        } else if (f.type === 'neq') {
          rows = rows.filter((r: any) => r[f.field] !== f.value)
        } else if (f.type === 'in') {
          rows = rows.filter((r: any) => (f.value as any[]).includes(r[f.field]))
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
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/doc.pdf' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.test/public/doc.pdf' } }),
      }),
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
  return {
    url,
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue(body ?? {}),
    cookies: { getAll: () => [], get: () => undefined },
    nextUrl: new URL(url, 'http://localhost:3000'),
  } as any
}

// ─── Shared test IDs ──────────────────────────────────────────────────────────

const USER_ID_PROP = 'prop-123'
const USER_ID_TENANT = 'tenant-123'
const USER_ID_AGENCE = 'agence-123'
const USER_ID_TC = 'tc-123'
const OWNER_FILE_ID = 'owner-file-1'
const RENTAL_FILE_ID = 'rental-file-1'
const PROP_ID = 'property-1'
const LEASE_ID = 'lease-1'
const MANDAT_ID = 'mandat-1'
const DOC_ID = 'doc-1'

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: OWNER-FILE DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Owner Documents — GET /api/owner-file/documents (liste)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("retourne les documents du proprietaire", async () => {
    currentMockSupabase = buildMockSupabase({
      owner_files: [{ id: OWNER_FILE_ID, owner_id: USER_ID_PROP, status: 'DRAFT' }],
      owner_file_documents: [
        { id: DOC_ID, owner_file_id: OWNER_FILE_ID, type: 'ID_CARD', name: 'Carte identite.pdf', url: 'https://storage.test/id.pdf', status: 'PENDING' },
        { id: 'doc-2', owner_file_id: OWNER_FILE_ID, type: 'PROPERTY_TITLE', name: 'Titre foncier.pdf', url: 'https://storage.test/title.pdf', status: 'VALIDATED' },
      ],
    })

    const { GET } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest(`http://localhost:3000/api/owner-file/documents?ownerId=${USER_ID_PROP}`)
    const resp = await GET(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.documents).toHaveLength(2)
    expect(json.documents[0].type).toBe('ID_CARD')
    expect(json.documents[1].type).toBe('PROPERTY_TITLE')
  })

  it("retourne tableau vide si pas de documents", async () => {
    currentMockSupabase = buildMockSupabase({
      owner_files: [],
      owner_file_documents: [],
    })

    const { GET } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest(`http://localhost:3000/api/owner-file/documents?ownerId=${USER_ID_PROP}`)
    const resp = await GET(req)
    const json = await resp.json()

    expect(json.documents).toEqual([])
  })

  it("retourne 400 si ownerId manquant", async () => {
    currentMockSupabase = buildMockSupabase({})

    const { GET } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file/documents')
    const resp = await GET(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('ownerId')
  })

  it("retourne 401 si non authentifie", async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: null, accessToken: null,
      applyCookies: (resp: any) => resp,
    })

    const { GET } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest(`http://localhost:3000/api/owner-file/documents?ownerId=${USER_ID_PROP}`)
    const resp = await GET(req)

    expect(resp.status).toBe(401)
  })
})

describe("Owner Documents — POST /api/owner-file/documents (upload)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("upload un document valide sur un dossier DRAFT", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      owner_files: [{ id: OWNER_FILE_ID, owner_id: USER_ID_PROP, status: 'DRAFT' }],
      owner_file_documents: [],
      notifications: [],
    })

    const { POST } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file/documents', {
      method: 'POST',
      body: { ownerFileId: OWNER_FILE_ID, type: 'ID_CARD', name: 'Carte identite.pdf', content: 'base64data' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data.type).toBe('ID_CARD')
    expect(json.data.status).toBe('PENDING')

    const docs = currentMockSupabase.getTable('owner_file_documents')
    expect(docs).toHaveLength(1)
    expect(docs[0].owner_file_id).toBe(OWNER_FILE_ID)
    expect(docs[0].url).toContain('storage.test')
  })

  it("rejette si le dossier nest pas en DRAFT", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      owner_files: [{ id: OWNER_FILE_ID, owner_id: USER_ID_PROP, status: 'SUBMITTED' }],
      owner_file_documents: [],
    })

    const { POST } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file/documents', {
      method: 'POST',
      body: { ownerFileId: OWNER_FILE_ID, type: 'ID_CARD', name: 'doc.pdf' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('modifiable')
  })

  it("rejette un type de document invalide", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      owner_files: [{ id: OWNER_FILE_ID, owner_id: USER_ID_PROP, status: 'DRAFT' }],
    })

    const { POST } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file/documents', {
      method: 'POST',
      body: { ownerFileId: OWNER_FILE_ID, type: 'INVALID_TYPE', name: 'doc.pdf' },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(400)
  })

  it("rejette si ownerFileId ne nous appartient pas", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      owner_files: [{ id: OWNER_FILE_ID, owner_id: 'other-owner', status: 'DRAFT' }],
    })

    const { POST } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file/documents', {
      method: 'POST',
      body: { ownerFileId: OWNER_FILE_ID, type: 'ID_CARD', name: 'doc.pdf' },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(404)
  })

  it("notifie les TC lors de upload", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_TC, role: 'TIERS_CONFIANCE', is_active: true },
      ],
      owner_files: [{ id: OWNER_FILE_ID, owner_id: USER_ID_PROP, status: 'DRAFT' }],
      owner_file_documents: [],
      notifications: [],
    })

    const { POST } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file/documents', {
      method: 'POST',
      body: { ownerFileId: OWNER_FILE_ID, type: 'PROPERTY_TITLE', name: 'titre.pdf', content: 'base64' },
    })
    await POST(req)

    expect(mockNotifyMany).toHaveBeenCalled()
    expect(mockNotifyMany.mock.calls[0][0].userIds).toContain(USER_ID_TC)
    expect(mockNotifyMany.mock.calls[0][0].type).toBe('DOSSIER_UPDATE')
  })
})

describe("Owner Documents — DELETE /api/owner-file/documents (suppression)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("supprime un document existant", async () => {
    currentMockSupabase = buildMockSupabase({
      owner_files: [{ id: OWNER_FILE_ID, owner_id: USER_ID_PROP, status: 'DRAFT' }],
      owner_file_documents: [{
        id: DOC_ID, owner_file_id: OWNER_FILE_ID, type: 'ID_CARD',
        name: 'doc.pdf', url: 'https://storage.test/doc.pdf', status: 'PENDING',
        owner_file: { owner_id: USER_ID_PROP, status: 'DRAFT' },
      }],
    })

    const { DELETE } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest(`http://localhost:3000/api/owner-file/documents?docId=${DOC_ID}`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.success).toBe(true)
    expect(currentMockSupabase.getTable('owner_file_documents')).toHaveLength(0)
  })

  it("retourne 404 si le document n existe pas", async () => {
    currentMockSupabase = buildMockSupabase({
      owner_files: [],
      owner_file_documents: [],
    })

    const { DELETE } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest(`http://localhost:3000/api/owner-file/documents?docId=unknown`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req)

    expect(resp.status).toBe(404)
  })

  it("retourne 404 si le document ne nous appartient pas", async () => {
    currentMockSupabase = buildMockSupabase({
      owner_files: [{ id: 'other-file', owner_id: 'other-owner', status: 'DRAFT' }],
      owner_file_documents: [{
        id: DOC_ID, owner_file_id: 'other-file', type: 'ID_CARD',
        name: 'doc.pdf', url: 'https://storage.test/doc.pdf', status: 'PENDING',
        owner_file: { owner_id: 'other-owner', status: 'DRAFT' },
      }],
    })

    const { DELETE } = await import('@/app/api/owner-file/documents/route')
    const req = createNextRequest(`http://localhost:3000/api/owner-file/documents?docId=${DOC_ID}`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req)

    expect(resp.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: RENTAL-FILE DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Rental Documents — POST /api/rental-file/documents (upload)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("upload un document valide sur un dossier DRAFT", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      rental_files: [{ id: RENTAL_FILE_ID, tenant_id: USER_ID_TENANT, status: 'DRAFT' }],
      rental_file_documents: [],
    })

    const { POST } = await import('@/app/api/rental-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/rental-file/documents', {
      method: 'POST',
      body: { rentalFileId: RENTAL_FILE_ID, type: 'ID_CARD', name: 'Carte identite.pdf', content: 'base64data' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data.type).toBe('ID_CARD')
    expect(json.data.status).toBe('PENDING')

    const docs = currentMockSupabase.getTable('rental_file_documents')
    expect(docs).toHaveLength(1)
  })

  it("rejette si le dossier nest pas en DRAFT", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      rental_files: [{ id: RENTAL_FILE_ID, tenant_id: USER_ID_TENANT, status: 'SUBMITTED' }],
    })

    const { POST } = await import('@/app/api/rental-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/rental-file/documents', {
      method: 'POST',
      body: { rentalFileId: RENTAL_FILE_ID, type: 'ID_CARD', name: 'doc.pdf' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('modifiable')
  })

  it("rejette un type de document invalide", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
      rental_files: [{ id: RENTAL_FILE_ID, tenant_id: USER_ID_TENANT, status: 'DRAFT' }],
    })

    const { POST } = await import('@/app/api/rental-file/documents/route')
    const req = createNextRequest('http://localhost:3000/api/rental-file/documents', {
      method: 'POST',
      body: { rentalFileId: RENTAL_FILE_ID, type: 'INVALID_TYPE', name: 'doc.pdf' },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('Type de document invalide')
  })
})

describe("Rental Documents — DELETE /api/rental-file/documents (suppression)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("supprime un document existant", async () => {
    currentMockSupabase = buildMockSupabase({
      rental_files: [{ id: RENTAL_FILE_ID, tenant_id: USER_ID_TENANT, status: 'DRAFT' }],
      rental_file_documents: [{
        id: DOC_ID, rental_file_id: RENTAL_FILE_ID, type: 'PAY_SLIP',
        name: 'bulletin.pdf', url: 'https://storage.test/pay.pdf', status: 'PENDING',
        rental_file: { tenant_id: USER_ID_TENANT, status: 'DRAFT' },
      }],
    })

    const { DELETE } = await import('@/app/api/rental-file/documents/route')
    const req = createNextRequest(`http://localhost:3000/api/rental-file/documents?docId=${DOC_ID}`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.success).toBe(true)
    expect(currentMockSupabase.getTable('rental_file_documents')).toHaveLength(0)
  })

  it("retourne 404 si le document n existe pas", async () => {
    currentMockSupabase = buildMockSupabase({
      rental_files: [],
      rental_file_documents: [],
    })

    const { DELETE } = await import('@/app/api/rental-file/documents/route')
    const req = createNextRequest(`http://localhost:3000/api/rental-file/documents?docId=unknown`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req)

    expect(resp.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: MANDATS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Mandats — POST /api/mandats (creation)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("cree un mandat DRAFT valide", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_AGENCE, role: 'AGENCE', active_role: 'AGENCE' },
      ],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Immeuble' }],
      mandats: [],
      property_images: [],
      notifications: [],
    })

    const { POST } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats', {
      method: 'POST',
      body: {
        propertyId: PROP_ID,
        agencyId: USER_ID_AGENCE,
        type: 'GESTION_COMPLETE',
        commissionRate: 8,
        startDate: '2026-07-01T00:00:00Z',
        endDate: '2027-06-30T00:00:00Z',
      },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(201)
    expect(json.mandat.status).toBe('DRAFT')
    expect(json.mandat.type).toBe('GESTION_COMPLETE')
    expect(json.mandat.commissionRate).toBe(8)

    const mandats = currentMockSupabase.getTable('mandats')
    expect(mandats).toHaveLength(1)

    // Notification a l'agence
    expect(mockNotify).toHaveBeenCalled()
    expect(mockNotify.mock.calls[0][0].userId).toBe(USER_ID_AGENCE)
    expect(mockNotify.mock.calls[0][0].type).toBe('LEASE_UPDATE')
  })

  it("rejette si le role nest pas PROPRIETAIRE", async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
    })

    const { POST } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats', {
      method: 'POST',
      body: { propertyId: PROP_ID, agencyId: USER_ID_AGENCE, type: 'GESTION_COMPLETE', commissionRate: 8, startDate: '2026-07-01', endDate: '2027-06-30' },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(403)
  })

  it("rejette si des champs requis manquent", async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
    })

    const { POST } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats', {
      method: 'POST',
      body: { propertyId: PROP_ID },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(400)
  })

  it("rejette si un mandat actif existe deja pour cette propriete", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_AGENCE, role: 'AGENCE', active_role: 'AGENCE' },
      ],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Immeuble' }],
      mandats: [{
        id: 'existing-mandat', property_id: PROP_ID, owner_id: USER_ID_PROP,
        agency_id: USER_ID_AGENCE, status: 'ACTIVE', type: 'GESTION_COMPLETE',
      }],
    })

    const { POST } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats', {
      method: 'POST',
      body: {
        propertyId: PROP_ID, agencyId: USER_ID_AGENCE, type: 'GESTION_COMPLETE',
        commissionRate: 8, startDate: '2026-07-01', endDate: '2027-06-30',
      },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(409)
    expect(json.error).toContain('déjà')
  })

  it("rejette si la propriete ne nous appartient pas", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_AGENCE, role: 'AGENCE', active_role: 'AGENCE' },
      ],
      properties: [{ id: PROP_ID, owner_id: 'other-owner', title: 'Bien pas a moi' }],
      mandats: [],
    })

    const { POST } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats', {
      method: 'POST',
      body: {
        propertyId: PROP_ID, agencyId: USER_ID_AGENCE, type: 'GESTION_COMPLETE',
        commissionRate: 8, startDate: '2026-07-01', endDate: '2027-06-30',
      },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(403)
  })

  it("rejette un type de mandat invalide", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_AGENCE, role: 'AGENCE', active_role: 'AGENCE' },
      ],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Test' }],
    })

    const { POST } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats', {
      method: 'POST',
      body: {
        propertyId: PROP_ID, agencyId: USER_ID_AGENCE, type: 'INVALID',
        commissionRate: 8, startDate: '2026-07-01', endDate: '2027-06-30',
      },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('Type invalide')
  })

  it("rejette si date debut >= date fin", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_AGENCE, role: 'AGENCE', active_role: 'AGENCE' },
      ],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Test' }],
      mandats: [],
    })

    const { POST } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats', {
      method: 'POST',
      body: {
        propertyId: PROP_ID, agencyId: USER_ID_AGENCE, type: 'GESTION_COMPLETE',
        commissionRate: 8, startDate: '2027-06-30', endDate: '2026-07-01',
      },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(400)
    expect(json.error).toContain('rieure')
  })
})

describe("Mandats — GET /api/mandats (liste)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("retourne la liste des mandats du proprietaire", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_AGENCE, role: 'AGENCE', first_name: 'Agence', last_name: 'Test' },
      ],
      mandats: [{
        id: MANDAT_ID, property_id: PROP_ID, owner_id: USER_ID_PROP,
        agency_id: USER_ID_AGENCE, type: 'GESTION_COMPLETE', status: 'ACTIVE',
        commission_rate: 8, start_date: '2026-07-01', end_date: '2027-06-30',
        created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
      }],
      properties: [{ id: PROP_ID, title: 'Bel Immeuble', type: 'IMMEUBLE', address: 'Adresse', city: 'Abidjan' }],
      property_images: [],
    })

    const { GET } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats')
    const resp = await GET(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.mandats).toHaveLength(1)
    expect(json.mandats[0].status).toBe('ACTIVE')
    expect(json.mandats[0].type).toBe('GESTION_COMPLETE')
    expect(json.mandats[0].property).toBeDefined()
    expect(json.mandats[0].property.title).toBe('Bel Immeuble')
  })

  it("filtre par statut", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_AGENCE, role: 'AGENCE', first_name: 'A', last_name: 'B' },
      ],
      mandats: [
        { id: 'm1', property_id: PROP_ID, owner_id: USER_ID_PROP, agency_id: USER_ID_AGENCE, status: 'DRAFT', commission_rate: 5, start_date: '2026-07-01', end_date: '2027-06-30', created_at: '', updated_at: '' },
        { id: 'm2', property_id: PROP_ID, owner_id: USER_ID_PROP, agency_id: USER_ID_AGENCE, status: 'ACTIVE', commission_rate: 8, start_date: '2026-07-01', end_date: '2027-06-30', created_at: '', updated_at: '' },
      ],
      properties: [{ id: PROP_ID, title: 'Test' }],
      property_images: [],
    })

    const { GET } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats?status=ACTIVE')
    const resp = await GET(req)
    const json = await resp.json()

    expect(json.mandats).toHaveLength(1)
    expect(json.mandats[0].status).toBe('ACTIVE')
  })

  it("retourne 403 si le role nest pas proprietaire/agence", async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
    })

    const { GET } = await import('@/app/api/mandats/route')
    const req = createNextRequest('http://localhost:3000/api/mandats')
    const resp = await GET(req)

    expect(resp.status).toBe(403)
  })
})

describe("Mandats — PATCH /api/mandats/[id] (actions)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Proprietaire signe", () => {
    beforeEach(() => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_PROP,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
    })

    it("signe un mandat DRAFT vers PENDING_SIGNATURE", async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
          { id: USER_ID_AGENCE, role: 'AGENCE', first_name: 'Agence', last_name: 'Test' },
        ],
        mandats: [{
          id: MANDAT_ID, property_id: PROP_ID, owner_id: USER_ID_PROP,
          agency_id: USER_ID_AGENCE, status: 'DRAFT', type: 'GESTION_COMPLETE',
          commission_rate: 8, start_date: '2026-07-01', end_date: '2027-06-30',
          owner_signed_at: null, agency_signed_at: null,
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Bel Immeuble' }],
        property_images: [],
        notifications: [],
      })

      const { PATCH } = await import('@/app/api/mandats/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/mandats/${MANDAT_ID}`, {
        method: 'PATCH',
        body: { action: 'sign' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: MANDAT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.mandat.status).toBe('PENDING_SIGNATURE')
      expect(json.mandat.ownerSignedAt).toBeDefined()
      expect(json.mandat.agencySignedAt).toBeNull()

      // Note: le handler PATCH/sign ne notifie pas l'agence directement
    })

    it("passe en ACTIVE si agence a deja signe", async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
          { id: USER_ID_AGENCE, role: 'AGENCE', first_name: 'A', last_name: 'B' },
        ],
        mandats: [{
          id: MANDAT_ID, property_id: PROP_ID, owner_id: USER_ID_PROP,
          agency_id: USER_ID_AGENCE, status: 'PENDING_SIGNATURE', type: 'GESTION_COMPLETE',
          commission_rate: 8, start_date: '2026-07-01', end_date: '2027-06-30',
          owner_signed_at: null, agency_signed_at: '2026-06-15T00:00:00Z',
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Bel Immeuble' }],
        property_images: [],
        notifications: [],
      })

      const { PATCH } = await import('@/app/api/mandats/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/mandats/${MANDAT_ID}`, {
        method: 'PATCH',
        body: { action: 'sign' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: MANDAT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.mandat.status).toBe('ACTIVE')
      expect(json.mandat.ownerSignedAt).toBeDefined()
    })

    it("rejette si deja signe", async () => {
      currentMockSupabase = buildMockSupabase({
        users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
        mandats: [{
          id: MANDAT_ID, property_id: PROP_ID, owner_id: USER_ID_PROP,
          agency_id: USER_ID_AGENCE, status: 'PENDING_SIGNATURE',
          owner_signed_at: '2026-06-01T00:00:00Z', agency_signed_at: null,
          commission_rate: 8, start_date: '2026-07-01', end_date: '2027-06-30',
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Test' }],
      })

      const { PATCH } = await import('@/app/api/mandats/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/mandats/${MANDAT_ID}`, {
        method: 'PATCH',
        body: { action: 'sign' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: MANDAT_ID }) })

      expect(resp.status).toBe(400)
      expect(resp.json).toBeDefined()
    })
  })

  describe("Resiliation du mandat", () => {
    beforeEach(() => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_PROP,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
    })

    it("resilie un mandat ACTIVE", async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
          { id: USER_ID_AGENCE, role: 'AGENCE' },
        ],
        mandats: [{
          id: MANDAT_ID, property_id: PROP_ID, owner_id: USER_ID_PROP,
          agency_id: USER_ID_AGENCE, status: 'ACTIVE', type: 'GESTION_COMPLETE',
          commission_rate: 8, start_date: '2026-07-01', end_date: '2027-06-30',
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Bel Immeuble' }],
        property_images: [],
        notifications: [],
      })

      const { PATCH } = await import('@/app/api/mandats/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/mandats/${MANDAT_ID}`, {
        method: 'PATCH',
        body: { action: 'terminate', terminationReason: 'Vente du bien' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: MANDAT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.mandat.status).toBe('TERMINATED')
    })

    it("rejette si raison manquante", async () => {
      currentMockSupabase = buildMockSupabase({
        users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
        mandats: [{
          id: MANDAT_ID, property_id: PROP_ID, owner_id: USER_ID_PROP,
          agency_id: USER_ID_AGENCE, status: 'ACTIVE', commission_rate: 8,
          start_date: '2026-07-01', end_date: '2027-06-30',
          created_at: '', updated_at: '',
        }],
      })

      const { PATCH } = await import('@/app/api/mandats/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/mandats/${MANDAT_ID}`, {
        method: 'PATCH',
        body: { action: 'terminate' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: MANDAT_ID }) })

      expect(resp.status).toBe(400)
    })
  })

  describe("Modification du mandat DRAFT", () => {
    beforeEach(() => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_PROP,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
    })

    it("modifie un mandat en DRAFT", async () => {
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
          { id: USER_ID_AGENCE, role: 'AGENCE' },
        ],
        mandats: [{
          id: MANDAT_ID, property_id: PROP_ID, owner_id: USER_ID_PROP,
          agency_id: USER_ID_AGENCE, status: 'DRAFT', type: 'GESTION_COMPLETE',
          commission_rate: 8, start_date: '2026-07-01', end_date: '2027-06-30',
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Test' }],
        property_images: [],
      })

      const { PATCH } = await import('@/app/api/mandats/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/mandats/${MANDAT_ID}`, {
        method: 'PATCH',
        body: { commissionRate: 10 },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: MANDAT_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.mandat.commissionRate).toBe(10)
    })
  })
})

describe("Mandats — GET /api/mandats/[id] (detail)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("retourne le detail d un mandat", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE', first_name: 'Jean', last_name: 'Dupont' },
        { id: USER_ID_AGENCE, role: 'AGENCE', first_name: 'Agence', last_name: 'Test' },
      ],
      mandats: [{
        id: MANDAT_ID, property_id: PROP_ID, owner_id: USER_ID_PROP,
        agency_id: USER_ID_AGENCE, status: 'ACTIVE', type: 'GESTION_COMPLETE',
        commission_rate: 8, start_date: '2026-07-01', end_date: '2027-06-30',
        created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
        owner_signed_at: '2026-06-15T00:00:00Z', agency_signed_at: '2026-06-16T00:00:00Z',
      }],
      properties: [{ id: PROP_ID, title: 'Bel Immeuble', type: 'IMMEUBLE', address: 'Adresse', city: 'Abidjan', price: 500000 }],
      property_images: [],
    })

    const { GET } = await import('@/app/api/mandats/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/mandats/${MANDAT_ID}`)
    const resp = await GET(req, { params: Promise.resolve({ id: MANDAT_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.mandat.id).toBe(MANDAT_ID)
    expect(json.mandat.status).toBe('ACTIVE')
    expect(json.mandat.property).toBeDefined()
    expect(json.mandat.owner).toBeDefined()
    expect(json.mandat.agency).toBeDefined()
  })

  it("retourne 404 si mandat introuvable", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      mandats: [],
    })

    const { GET } = await import('@/app/api/mandats/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/mandats/unknown`)
    const resp = await GET(req, { params: Promise.resolve({ id: 'unknown' }) })

    expect(resp.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: LEASES (Baux)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Leases — POST /api/leases/create (creation de bail)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("cree un bail PENDING_SIGNATURE avec toutes les infos valides", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_TENANT, role: 'LOCATAIRE', first_name: 'Jean', last_name: 'Dupont' },
      ],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Bel Appartement' }],
      rental_files: [{ id: RENTAL_FILE_ID, tenant_id: USER_ID_TENANT, status: 'VALIDATED' }],
      leases: [],
      property_images: [],
      notifications: [],
      audit_logs: [],
    })

    const { POST } = await import('@/app/api/leases/create/route')
    const req = createNextRequest('http://localhost:3000/api/leases/create', {
      method: 'POST',
      body: {
        rentalFileId: RENTAL_FILE_ID,
        propertyId: PROP_ID,
        tenantId: USER_ID_TENANT,
        monthlyRent: 300000,
        charges: 15000,
        deposit: 300000,
        startDate: '2026-07-01T00:00:00Z',
        endDate: '2027-06-30T00:00:00Z',
      },
    })
    const resp = await POST(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data.status).toBe('PENDING_SIGNATURE')
    expect(json.data.monthlyRent).toBe(300000)
    expect(json.data.charges).toBe(15000)
    expect(json.data.propertyId).toBe(PROP_ID)
    expect(json.data.tenantId).toBe(USER_ID_TENANT)

    const leases = currentMockSupabase.getTable('leases')
    expect(leases).toHaveLength(1)
    expect(leases[0].status).toBe('PENDING_SIGNATURE')

    // Notification au locataire
    expect(mockNotify).toHaveBeenCalled()
    expect(mockNotify.mock.calls[0][0].userId).toBe(USER_ID_TENANT)
    expect(mockNotify.mock.calls[0][0].type).toBe('LEASE_UPDATE')
  })

  it("rejette si le dossier locatif nest pas VALIDATED", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_TENANT, role: 'LOCATAIRE' },
      ],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Test' }],
      rental_files: [{ id: RENTAL_FILE_ID, tenant_id: USER_ID_TENANT, status: 'DRAFT' }],
      leases: [],
    })

    const { POST } = await import('@/app/api/leases/create/route')
    const req = createNextRequest('http://localhost:3000/api/leases/create', {
      method: 'POST',
      body: {
        rentalFileId: RENTAL_FILE_ID, propertyId: PROP_ID, tenantId: USER_ID_TENANT,
        monthlyRent: 300000, startDate: '2026-07-01', endDate: '2027-06-30',
      },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(400)
  })

  it("rejette si le bien ne nous appartient pas", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_TENANT, role: 'LOCATAIRE' },
      ],
      properties: [{ id: PROP_ID, owner_id: 'other-owner', title: 'Test' }],
      rental_files: [{ id: RENTAL_FILE_ID, tenant_id: USER_ID_TENANT, status: 'VALIDATED' }],
    })

    const { POST } = await import('@/app/api/leases/create/route')
    const req = createNextRequest('http://localhost:3000/api/leases/create', {
      method: 'POST',
      body: {
        rentalFileId: RENTAL_FILE_ID, propertyId: PROP_ID, tenantId: USER_ID_TENANT,
        monthlyRent: 300000, startDate: '2026-07-01', endDate: '2027-06-30',
      },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(403)
  })

  it("rejette si un bail actif existe deja pour ce locataire/bien", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_TENANT, role: 'LOCATAIRE' },
      ],
      properties: [{ id: PROP_ID, owner_id: USER_ID_PROP, title: 'Test' }],
      rental_files: [{ id: RENTAL_FILE_ID, tenant_id: USER_ID_TENANT, status: 'VALIDATED' }],
      leases: [{
        id: 'existing-lease', property_id: PROP_ID, tenant_id: USER_ID_TENANT,
        owner_id: USER_ID_PROP, status: 'ACTIVE',
      }],
    })

    const { POST } = await import('@/app/api/leases/create/route')
    const req = createNextRequest('http://localhost:3000/api/leases/create', {
      method: 'POST',
      body: {
        rentalFileId: RENTAL_FILE_ID, propertyId: PROP_ID, tenantId: USER_ID_TENANT,
        monthlyRent: 300000, startDate: '2026-07-01', endDate: '2027-06-30',
      },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(400)
  })

  it("rejette si champs requis manquants", async () => {
    const { POST } = await import('@/app/api/leases/create/route')
    const req = createNextRequest('http://localhost:3000/api/leases/create', {
      method: 'POST',
      body: {},
    })
    const resp = await POST(req)

    expect(resp.status).toBe(400)
  })

  it("rejette si le role nest pas PROPRIETAIRE/AGENCE", async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
    })

    const { POST } = await import('@/app/api/leases/create/route')
    const req = createNextRequest('http://localhost:3000/api/leases/create', {
      method: 'POST',
      body: { rentalFileId: 'x', propertyId: 'x', tenantId: 'x', monthlyRent: 100, startDate: 'a', endDate: 'b' },
    })
    const resp = await POST(req)

    expect(resp.status).toBe(403)
  })
})

describe("Leases — GET /api/leases (liste)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("retourne la liste des baux du proprietaire", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_TENANT, role: 'LOCATAIRE', first_name: 'Jean', last_name: 'Dupont' },
      ],
      leases: [{
        id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
        owner_id: USER_ID_PROP, status: 'ACTIVE', monthly_rent: 300000,
        start_date: '2026-07-01', end_date: '2027-06-30',
        charges: 15000, deposit: 300000,
        created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
      }],
      properties: [{ id: PROP_ID, title: 'Bel Appartement', address: 'Adresse', city: 'Abidjan' }],
      property_images: [],
      payments: [],
    })

    const { GET } = await import('@/app/api/leases/route')
    const req = createNextRequest('http://localhost:3000/api/leases')
    const resp = await GET(req)
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].status).toBe('ACTIVE')
    expect(json.data[0].monthlyRent).toBe(300000)
    expect(json.data[0].property).toBeDefined()
    expect(json.data[0].property.title).toBe('Bel Appartement')
    expect(json.data[0].tenant).toBeDefined()
    expect(json.data[0].tenant.firstName).toBe('Jean')
  })

  it("filtre par statut", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: USER_ID_TENANT, role: 'LOCATAIRE' },
      ],
      leases: [
        { id: 'l1', property_id: PROP_ID, tenant_id: USER_ID_TENANT, owner_id: USER_ID_PROP, status: 'ACTIVE', monthly_rent: 300000, start_date: 'a', end_date: 'b', created_at: '', updated_at: '' },
        { id: 'l2', property_id: PROP_ID, tenant_id: USER_ID_TENANT, owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE', monthly_rent: 300000, start_date: 'a', end_date: 'b', created_at: '', updated_at: '' },
      ],
      properties: [{ id: PROP_ID, title: 'Test' }],
      property_images: [],
      payments: [],
    })

    const { GET } = await import('@/app/api/leases/route')
    const req = createNextRequest('http://localhost:3000/api/leases?status=ACTIVE')
    const resp = await GET(req)
    const json = await resp.json()

    expect(json.data).toHaveLength(1)
    expect(json.data[0].status).toBe('ACTIVE')
  })

  it("retourne 403 si le role nest pas proprietaire/locataire", async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TC,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TC, role: 'TIERS_CONFIANCE', active_role: 'TIERS_CONFIANCE' }],
    })

    const { GET } = await import('@/app/api/leases/route')
    const req = createNextRequest('http://localhost:3000/api/leases')
    const resp = await GET(req)

    expect(resp.status).toBe(403)
  })
})

describe("Leases — GET /api/leases/[id] (detail)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("retourne le detail d un bail (accessible locataire/proprio)", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [
        { id: USER_ID_TENANT, role: 'LOCATAIRE', active_role: 'LOCATAIRE', first_name: 'Jean', last_name: 'Dupont' },
        { id: USER_ID_PROP, role: 'PROPRIETAIRE', first_name: 'Marie', last_name: 'Kone' },
      ],
      leases: [{
        id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
        owner_id: USER_ID_PROP, status: 'ACTIVE', monthly_rent: 300000,
        charges: 15000, deposit: 300000,
        start_date: '2026-07-01', end_date: '2027-06-30',
        owner_signed_at: '2026-06-15T00:00:00Z', tenant_signed_at: '2026-06-16T00:00:00Z',
        created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
      }],
      properties: [{ id: PROP_ID, title: 'Bel Appart', address: 'Adresse', city: 'Abidjan', type: 'APPARTEMENT', price: 300000 }],
      property_images: [],
      payments: [],
      maintenance_requests: [],
    })

    const { GET } = await import('@/app/api/leases/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`)
    const resp = await GET(req, { params: Promise.resolve({ id: LEASE_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.data.id).toBe(LEASE_ID)
    expect(json.data.status).toBe('ACTIVE')
    expect(json.data.monthlyRent).toBe(300000)
    expect(json.data.property.title).toBe('Bel Appart')
    expect(json.data.tenant.firstName).toBe('Jean')
    expect(json.data.owner.firstName).toBe('Marie')
  })

  it("retourne 404 si non autorise (ni proprio ni locataire)", async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TC,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TC, role: 'TIERS_CONFIANCE' }],
      leases: [{
        id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
        owner_id: USER_ID_PROP, status: 'ACTIVE',
      }],
    })

    const { GET } = await import('@/app/api/leases/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`)
    const resp = await GET(req, { params: Promise.resolve({ id: LEASE_ID }) })

    expect(resp.status).toBe(404)
  })
})

describe("Leases — PATCH /api/leases/[id] (actions)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Signature", () => {
    it("locataire signe -> PENDING_SIGNATURE (en attente proprio)", async () => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_TENANT,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_TENANT, role: 'LOCATAIRE', first_name: 'Jean', last_name: 'Dupont' },
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', first_name: 'Marie', last_name: 'Kone' },
        ],
        leases: [{
          id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE', monthly_rent: 300000,
          start_date: '2026-07-01', end_date: '2027-06-30',
          owner_signed_at: null, tenant_signed_at: null,
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Bel Appart' }],
        property_images: [],
        notifications: [],
        audit_logs: [],
      })

      const { PATCH } = await import('@/app/api/leases/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
        method: 'PATCH',
        body: { action: 'sign' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: LEASE_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.status).toBe('PENDING_SIGNATURE')
      expect(json.data.tenantSignedAt).toBeDefined()
      expect(json.data.ownerSignedAt).toBeNull()
    })

    it("deuxieme signature -> ACTIVE", async () => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_TENANT,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_TENANT, role: 'LOCATAIRE', first_name: 'Jean', last_name: 'Dupont' },
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', first_name: 'Marie', last_name: 'Kone' },
        ],
        leases: [{
          id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE', monthly_rent: 300000,
          start_date: '2026-07-01', end_date: '2027-06-30',
          owner_signed_at: '2026-06-15T00:00:00Z', tenant_signed_at: null,
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Bel Appart' }],
        property_images: [],
        notifications: [],
        audit_logs: [],
      })

      const { PATCH } = await import('@/app/api/leases/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
        method: 'PATCH',
        body: { action: 'sign' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: LEASE_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.status).toBe('ACTIVE')
    })

    it("rejette si deja signe", async () => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_TENANT,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
      currentMockSupabase = buildMockSupabase({
        users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE' }],
        leases: [{
          id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE',
          tenant_signed_at: '2026-06-15T00:00:00Z',
          owner_signed_at: null,
        }],
      })

      const { PATCH } = await import('@/app/api/leases/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
        method: 'PATCH',
        body: { action: 'sign' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: LEASE_ID }) })

      expect(resp.status).toBe(400)
    })
  })

  describe("Resiliation", () => {
    it("resilie un bail ACTIVE", async () => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_TENANT,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_TENANT, role: 'LOCATAIRE', first_name: 'Jean', last_name: 'Dupont' },
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', first_name: 'Marie', last_name: 'Kone' },
        ],
        leases: [{
          id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          owner_id: USER_ID_PROP, status: 'ACTIVE', monthly_rent: 300000,
          start_date: '2026-07-01', end_date: '2027-06-30',
          owner_signed_at: '2026-06-15T00:00:00Z', tenant_signed_at: '2026-06-15T00:00:00Z',
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Bel Appart' }],
        property_images: [],
        notifications: [],
        audit_logs: [],
      })

      const { PATCH } = await import('@/app/api/leases/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
        method: 'PATCH',
        body: { action: 'terminate' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: LEASE_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.status).toBe('TERMINATED')
    })

    it("rejette si le bail nest pas ACTIVE", async () => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_TENANT,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
      currentMockSupabase = buildMockSupabase({
        users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE' }],
        leases: [{
          id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE',
        }],
      })

      const { PATCH } = await import('@/app/api/leases/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
        method: 'PATCH',
        body: { action: 'terminate' },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: LEASE_ID }) })

      expect(resp.status).toBe(400)
    })
  })

  describe("Modification", () => {
    it("modifie un bail PENDING_SIGNATURE", async () => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_PROP,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
      currentMockSupabase = buildMockSupabase({
        users: [
          { id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
          { id: USER_ID_TENANT, role: 'LOCATAIRE' },
        ],
        leases: [{
          id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE', monthly_rent: 300000,
          start_date: '2026-07-01', end_date: '2027-06-30',
          owner_signed_at: null, tenant_signed_at: null,
          created_at: '', updated_at: '',
        }],
        properties: [{ id: PROP_ID, title: 'Bel Appart' }],
        property_images: [],
        notifications: [],
        audit_logs: [],
      })

      const { PATCH } = await import('@/app/api/leases/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
        method: 'PATCH',
        body: { action: 'modify', monthlyRent: 350000 },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: LEASE_ID }) })
      const json = await resp.json()

      expect(resp.status).toBe(200)
      expect(json.data.monthlyRent).toBe(350000)
    })

    it("rejette si le proprietaire nest pas le owner", async () => {
      mockResolveRequestUser.mockResolvedValue({
        userId: USER_ID_TENANT,
        accessToken: null,
        authSource: 'session' as const,
        applyCookies: (resp: any) => resp,
      })
      currentMockSupabase = buildMockSupabase({
        users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE' }],
        leases: [{
          id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
          owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE',
        }],
      })

      const { PATCH } = await import('@/app/api/leases/[id]/route')
      const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
        method: 'PATCH',
        body: { action: 'modify', monthlyRent: 350000 },
      })
      const resp = await PATCH(req, { params: Promise.resolve({ id: LEASE_ID }) })

      expect(resp.status).toBe(403)
    })
  })
})

describe("Leases — DELETE /api/leases/[id] (suppression)", () => {
  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_PROP,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it("supprime un bail PENDING_SIGNATURE non signe", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      leases: [{
        id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
        owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE',
        owner_signed_at: null, tenant_signed_at: null,
      }],
    })

    const { DELETE } = await import('@/app/api/leases/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req, { params: Promise.resolve({ id: LEASE_ID }) })
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.success).toBe(true)
    expect(currentMockSupabase.getTable('leases')).toHaveLength(0)
  })

  it("rejette si bail deja signe", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      leases: [{
        id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
        owner_id: USER_ID_PROP, status: 'ACTIVE',
        owner_signed_at: '2026-06-15T00:00:00Z', tenant_signed_at: '2026-06-15T00:00:00Z',
      }],
    })

    const { DELETE } = await import('@/app/api/leases/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req, { params: Promise.resolve({ id: LEASE_ID }) })

    expect(resp.status).toBe(400)
  })

  it("retourne 403 si pas le proprietaire", async () => {
    mockResolveRequestUser.mockResolvedValue({
      userId: USER_ID_TENANT,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_TENANT, role: 'LOCATAIRE' }],
      leases: [{
        id: LEASE_ID, property_id: PROP_ID, tenant_id: USER_ID_TENANT,
        owner_id: USER_ID_PROP, status: 'PENDING_SIGNATURE',
      }],
    })

    const { DELETE } = await import('@/app/api/leases/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/leases/${LEASE_ID}`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req, { params: Promise.resolve({ id: LEASE_ID }) })

    expect(resp.status).toBe(403)
  })

  it("retourne 404 si bail introuvable", async () => {
    currentMockSupabase = buildMockSupabase({
      users: [{ id: USER_ID_PROP, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
      leases: [],
    })

    const { DELETE } = await import('@/app/api/leases/[id]/route')
    const req = createNextRequest(`http://localhost:3000/api/leases/unknown`, {
      method: 'DELETE',
    })
    const resp = await DELETE(req, { params: Promise.resolve({ id: 'unknown' }) })

    expect(resp.status).toBe(404)
  })
})
