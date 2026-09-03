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

// ─── Supabase mock ────────────────────────────────────────────────────────────

interface MockTableData {
  [tableName: string]: any[]
}

function buildMockSupabase(initialData: MockTableData = {}) {
  // Deep clone initial data
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

    constructor(table: string) {
      this._table = table
    }

    select(_fields: string, opts?: { count: 'exact' }) {
      if (opts?.count === 'exact') this._countMode = true
      return this
    }

    count() { this._countMode = true; return this }

    eq(field: string, value: any) {
      this._filters.push({ type: 'eq', field, value }); return this
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

    order(field: string, opts: { ascending: boolean }) {
      this._orders.push({ field, ascending: opts?.ascending ?? true }); return this
    }

    limit(n: number) { this._limitVal = n; return this }

    range(from: number, to: number) {
      this._rangeVal = [from, to]; return this
    }

    // ─── Resolve queries ────────────────────────────────────────────────

    single() {
      const rows = this._resolve()
      if (rows.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'Row not found' } }
      }
      return { data: rows[0], error: null }
    }

    maybeSingle() {
      const rows = this._resolve()
      return { data: rows[0] ?? null, error: null }
    }

    // Called by `await query` — resolves the chain
    then(onfulfilled: (value: any) => void, _onrejected?: (err: any) => void) {
      try {
        const rows = this._resolve()
        if (this._countMode) {
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
      for (const item of rows) {
        tables[this._table].push({ ...item })
      }
      const first = rows[0] ?? null
      return {
        select: () => ({
          single: () => ({ data: first, error: null }),
          maybeSingle: () => ({ data: first, error: null }),
        }),
      }
    }

    update(data: any) { this._updateData = data; return this }

    // ─── Internal: apply filters + mutation ──────────────────────────────

    private _resolve(): any[] {
      let rows = tables[this._table] ?? []

      // Apply filters
      for (const f of this._filters) {
        if (f.type === 'eq') {
          rows = rows.filter((r: any) => r[f.field] === f.value)
        } else if (f.type === 'in') {
          rows = rows.filter((r: any) => (f.value as any[]).includes(r[f.field]))
        } else if (f.type === 'not') {
          const { op, value } = f.value
          if (op === 'eq') rows = rows.filter((r: any) => r[f.field] !== value)
        } else if (f.type === 'is') {
          if (f.value === null) rows = rows.filter((r: any) => r[f.field] === null)
        }
      }

      // Sort
      for (const ord of this._orders) {
        rows.sort((a: any, b: any) => {
          const va = a[ord.field] ?? ''
          const vb = b[ord.field] ?? ''
          return ord.ascending ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
        })
      }

      // Apply mutations (updates) BEFORE returning
      if (this._updateData) {
        for (const row of rows) {
          Object.assign(row, JSON.parse(JSON.stringify(this._updateData)))
        }
      }

      // Apply limit/range AFTER mutation
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
  } as unknown as NextRequest
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockResolveRequestUser.mockResolvedValue({
    userId: 'default-user',
    accessToken: null,
    authSource: 'session' as const,
    applyCookies: (resp: any) => resp,
  })
})

describe('Rental file resubmission (locataire)', () => {
  const TENANT_ID = 'tenant-123'
  const FILE_ID = 'rental-file-rejected-1'
  const DOC_ID = 'doc-1'

  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: TENANT_ID,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('resubmits a REJECTED rental file as SUBMITTED and clears rejection fields', async () => {
    currentMockSupabase = buildMockSupabase({
      rental_files: [{
        id: FILE_ID, tenant_id: TENANT_ID, status: 'REJECTED',
        rejection_reason: 'Revenus insuffisants',
        tc_comment: 'Veuillez fournir des bulletins de salaire plus récents.',
        reviewed_by_id: 'tc-user-1', reviewed_at: '2026-05-20T10:00:00Z',
        monthly_income: 300000, employer: 'Test Corp', employment_type: 'CDI',
        created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-20T10:00:00Z',
      }],
      rental_file_documents: [{
        id: DOC_ID, rental_file_id: FILE_ID, type: 'ID_CARD',
        status: 'REJECTED', tc_comment: 'Document illisible',
        name: 'id.pdf', url: 'https://ex.com/doc.pdf', created_at: '2026-05-15T00:00:00Z',
      }],
      users: [{ id: TENANT_ID, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
    })

    const { POST } = await import('@/app/api/rental-file/route')
    const req = createNextRequest('http://localhost:3000/api/rental-file', {
      method: 'POST', body: { submit: true },
    })
    const resp = await POST(req)
    const body = await resp.json()

    expect(resp.status).toBe(200)
    expect(body.data.status).toBe('SUBMITTED')
    expect(body.data.rejectionReason).toBeNull()
    expect(body.data.tcComment).toBeNull()
    expect(body.data.reviewedById).toBeNull()
    expect(body.data.reviewedAt).toBeNull()

    // Documents reset
    const doc = currentMockSupabase.getTable('rental_file_documents')[0]
    expect(doc.status).toBe('PENDING')
    expect(doc.tc_comment).toBeNull()

    // Audit log
    const auditLogs = currentMockSupabase.getTable('audit_logs')
    const submitLog = auditLogs.find((l: any) => l.action === 'SUBMIT')
    expect(submitLog).toBeDefined()
    expect(submitLog.entity).toBe('RentalFile')
    expect(submitLog.entity_id).toBe(FILE_ID)
    expect(submitLog.details).toContain('soumis à nouveau')
  })

  it('reopens a REJECTED rental file as DRAFT (no submit flag)', async () => {
    currentMockSupabase = buildMockSupabase({
      rental_files: [{
        id: FILE_ID, tenant_id: TENANT_ID, status: 'REJECTED',
        rejection_reason: 'Documents incomplets',
        tc_comment: "Pièce d'identité manquante",
        reviewed_by_id: 'tc-user-1', reviewed_at: '2026-05-20T10:00:00Z',
        monthly_income: 300000, employer: 'Test Corp', employment_type: 'CDI',
        created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-20T10:00:00Z',
      }],
      rental_file_documents: [{
        id: DOC_ID, rental_file_id: FILE_ID, type: 'ID_CARD',
        status: 'REJECTED', name: 'id.pdf',
        url: 'https://ex.com/doc.pdf', created_at: '2026-05-15T00:00:00Z',
      }],
      users: [{ id: TENANT_ID, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
    })

    const { POST } = await import('@/app/api/rental-file/route')
    const req = createNextRequest('http://localhost:3000/api/rental-file', {
      method: 'POST', body: {},
    })
    const resp = await POST(req)
    const body = await resp.json()

    expect(resp.status).toBe(200)
    expect(body.data.status).toBe('DRAFT')
    expect(body.data.rejectionReason).toBeNull()

    const doc = currentMockSupabase.getTable('rental_file_documents')[0]
    expect(doc.status).toBe('PENDING')

    const auditLogs = currentMockSupabase.getTable('audit_logs')
    expect(auditLogs.some((l: any) => l.details?.includes('rouvert en brouillon'))).toBe(true)
  })

  it('creates a NEW DRAFT if no REJECTED file exists', async () => {
    currentMockSupabase = buildMockSupabase({
      rental_files: [],
      rental_file_documents: [],
      users: [{ id: TENANT_ID, role: 'LOCATAIRE', active_role: 'LOCATAIRE' }],
    })

    const { POST } = await import('@/app/api/rental-file/route')
    const req = createNextRequest('http://localhost:3000/api/rental-file', {
      method: 'POST', body: {},
    })
    const resp = await POST(req)
    const body = await resp.json()

    expect(resp.status).toBe(200)
    expect(body.data.status).toBe('DRAFT')

    const auditLogs = currentMockSupabase.getTable('audit_logs')
    expect(auditLogs.some((l: any) => l.action === 'CREATE')).toBe(true)
  })
})

describe('Owner file resubmission (propriétaire)', () => {
  const OWNER_ID = 'owner-123'
  const FILE_ID = 'owner-file-rejected-1'
  const DOC_ID = 'owner-doc-1'

  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: OWNER_ID,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
  })

  it('resubmits a REJECTED owner file as SUBMITTED and clears rejection fields', async () => {
    currentMockSupabase = buildMockSupabase({
      owner_files: [{
        id: FILE_ID, owner_id: OWNER_ID, status: 'REJECTED',
        rejection_reason: 'Titre de propriété manquant',
        tc_comment: 'Veuillez fournir le titre de propriété.',
        reviewed_by_id: 'tc-user-1', reviewed_at: '2026-05-20T10:00:00Z',
        created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-20T10:00:00Z',
      }],
      owner_file_documents: [{
        id: DOC_ID, owner_file_id: FILE_ID, type: 'ID_CARD',
        status: 'REJECTED', tc_comment: 'Document illisible',
        name: 'id.pdf', url: 'https://ex.com/doc.pdf', created_at: '2026-05-15T00:00:00Z',
      }],
      users: [
        { id: OWNER_ID, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' },
        { id: 'tc-user-1', role: 'TIERS_CONFIANCE', active_role: 'TIERS_CONFIANCE', is_active: true },
      ],
    })

    const { POST } = await import('@/app/api/owner-file/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file', {
      method: 'POST', body: { submit: true },
    })
    const resp = await POST(req)
    const body = await resp.json()

    expect(resp.status).toBe(200)
    expect(body.data.status).toBe('SUBMITTED')
    expect(body.data.rejectionReason).toBeNull()
    expect(body.data.tcComment).toBeNull()
    expect(body.data.reviewedById).toBeNull()

    // Documents reset
    const doc = currentMockSupabase.getTable('owner_file_documents')[0]
    expect(doc.status).toBe('PENDING')
    expect(doc.tc_comment).toBeNull()

    // Audit log
    const auditLogs = currentMockSupabase.getTable('audit_logs')
    expect(auditLogs.some((l: any) => l.action === 'SUBMIT' && l.details?.includes('soumis à nouveau'))).toBe(true)

    // TC notified
    expect(mockNotifyMany).toHaveBeenCalled()
  })

  it('reopens a REJECTED owner file as DRAFT (no submit flag)', async () => {
    currentMockSupabase = buildMockSupabase({
      owner_files: [{
        id: FILE_ID, owner_id: OWNER_ID, status: 'REJECTED',
        rejection_reason: 'RIB manquant',
        tc_comment: 'Veuillez fournir un RIB.',
        reviewed_by_id: 'tc-user-1', reviewed_at: '2026-05-20T10:00:00Z',
        created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-20T10:00:00Z',
      }],
      owner_file_documents: [],
      users: [{ id: OWNER_ID, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
    })

    const { POST } = await import('@/app/api/owner-file/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file', {
      method: 'POST', body: {},
    })
    const resp = await POST(req)
    const body = await resp.json()

    expect(resp.status).toBe(200)
    expect(body.data.status).toBe('DRAFT')
    expect(body.data.rejectionReason).toBeNull()

    const auditLogs = currentMockSupabase.getTable('audit_logs')
    expect(auditLogs.some((l: any) => l.details?.includes('rouvert en brouillon'))).toBe(true)
  })

  it('creates a NEW DRAFT if no REJECTED owner file exists', async () => {
    currentMockSupabase = buildMockSupabase({
      owner_files: [],
      owner_file_documents: [],
      users: [{ id: OWNER_ID, role: 'PROPRIETAIRE', active_role: 'PROPRIETAIRE' }],
    })

    const { POST } = await import('@/app/api/owner-file/route')
    const req = createNextRequest('http://localhost:3000/api/owner-file', {
      method: 'POST', body: {},
    })
    const resp = await POST(req)
    const body = await resp.json()

    expect(resp.status).toBe(200)
    expect(body.data.status).toBe('DRAFT')

    const auditLogs = currentMockSupabase.getTable('audit_logs')
    expect(auditLogs.some((l: any) => l.action === 'CREATE')).toBe(true)
  })
})

describe('TC rejection of files', () => {
  const TC_USER_ID = 'tc-user-1'
  const TENANT_ID = 'tenant-456'
  const OWNER_ID = 'owner-456'
  const RENTAL_FILE_ID = 'rental-file-active-1'
  const OWNER_FILE_ID = 'owner-file-active-1'
  const REJECTION_REASON = 'Revenus insuffisants par rapport au loyer demandé'

  beforeEach(() => {
    mockResolveRequestUser.mockResolvedValue({
      userId: TC_USER_ID,
      accessToken: null,
      authSource: 'session' as const,
      applyCookies: (resp: any) => resp,
    })
    mockNotify.mockClear()
  })

  describe('PATCH /api/tc/rental-files', () => {
    it('rejects a SUBMITTED rental file and creates RENTAL_FILE_REJECTED audit log', async () => {
      currentMockSupabase = buildMockSupabase({
        rental_files: [{
          id: RENTAL_FILE_ID, tenant_id: TENANT_ID, status: 'SUBMITTED',
          priority: 'NORMAL', created_at: '2026-05-25T00:00:00Z', updated_at: '2026-05-25T00:00:00Z',
          tenant: { id: TENANT_ID, first_name: 'Jean', last_name: 'Dupont', role: 'LOCATAIRE' },
        }],
        users: [
          { id: TC_USER_ID, role: 'TIERS_CONFIANCE', active_role: 'TIERS_CONFIANCE' },
          { id: TENANT_ID, first_name: 'Jean', last_name: 'Dupont', role: 'LOCATAIRE' },
        ],
        audit_logs: [], validation_slas: [], applications: [], rental_file_documents: [],
      })

      const { PATCH } = await import('@/app/api/tc/rental-files/route')
      const req = createNextRequest('http://localhost:3000/api/tc/rental-files', {
        method: 'PATCH',
        body: { fileIds: [RENTAL_FILE_ID], action: 'REJECT', comment: REJECTION_REASON },
      })
      const resp = await PATCH(req)
      const body = await resp.json()

      expect(resp.status).toBe(200)
      expect(body.results).toHaveLength(1)
      expect(body.results[0].success).toBe(true)
      expect(body.results[0].file.status).toBe('REJECTED')
      expect(body.results[0].file.rejection_reason).toBe(REJECTION_REASON)
      expect(body.results[0].file.reviewed_by_id).toBe(TC_USER_ID)

      // Audit log
      const auditLogs = currentMockSupabase.getTable('audit_logs')
      expect(auditLogs.some((l: any) => l.action === 'RENTAL_FILE_REJECTED' && l.entity_id === RENTAL_FILE_ID)).toBe(true)

      // Notification
      expect(mockNotify).toHaveBeenCalled()
      const n = mockNotify.mock.calls[0][0]
      expect(n.userId).toBe(TENANT_ID)
      expect(n.type).toBe('DOSSIER_UPDATE')
      expect(n.message).toContain(REJECTION_REASON)
    })

    it('returns error for non-SUBMITTED/TC_REVIEW rental file', async () => {
      currentMockSupabase = buildMockSupabase({
        rental_files: [{ id: RENTAL_FILE_ID, tenant_id: TENANT_ID, status: 'VALIDATED', created_at: '', updated_at: '' }],
        users: [{ id: TC_USER_ID, role: 'TIERS_CONFIANCE', active_role: 'TIERS_CONFIANCE' }],
        audit_logs: [], validation_slas: [], applications: [],
      })

      const { PATCH } = await import('@/app/api/tc/rental-files/route')
      const req = createNextRequest('http://localhost:3000/api/tc/rental-files', {
        method: 'PATCH',
        body: { fileIds: [RENTAL_FILE_ID], action: 'REJECT', comment: 'Test' },
      })
      const resp = await PATCH(req)
      const body = await resp.json()

      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('pas en attente')
    })
  })

  describe('PATCH /api/tc/owner-files', () => {
    it('rejects a SUBMITTED owner file and creates OWNER_FILE_REJECTED audit log', async () => {
      currentMockSupabase = buildMockSupabase({
        owner_files: [{
          id: OWNER_FILE_ID, owner_id: OWNER_ID, status: 'SUBMITTED',
          created_at: '2026-05-25T00:00:00Z', updated_at: '2026-05-25T00:00:00Z',
          owner: { id: OWNER_ID, first_name: 'Marie', last_name: 'Koné', role: 'PROPRIETAIRE' },
        }],
        users: [
          { id: TC_USER_ID, role: 'TIERS_CONFIANCE', active_role: 'TIERS_CONFIANCE' },
          { id: OWNER_ID, first_name: 'Marie', last_name: 'Koné', role: 'PROPRIETAIRE' },
        ],
        audit_logs: [], owner_file_documents: [],
      })

      const { PATCH } = await import('@/app/api/tc/owner-files/route')
      const req = createNextRequest('http://localhost:3000/api/tc/owner-files', {
        method: 'PATCH',
        body: { fileIds: [OWNER_FILE_ID], action: 'REJECT', comment: 'Titre de propriété manquant' },
      })
      const resp = await PATCH(req)
      const body = await resp.json()

      expect(resp.status).toBe(200)
      expect(body.results[0].success).toBe(true)
      expect(body.results[0].file.status).toBe('REJECTED')
      expect(body.results[0].file.rejection_reason).toBe('Titre de propriété manquant')

      // Audit log
      const auditLogs = currentMockSupabase.getTable('audit_logs')
      expect(auditLogs.some((l: any) => l.action === 'OWNER_FILE_REJECTED')).toBe(true)

      // Notification
      expect(mockNotify).toHaveBeenCalled()
      expect(mockNotify.mock.calls[0][0].userId).toBe(OWNER_ID)
    })

    it('returns error for non-SUBMITTED/TC_REVIEW owner file', async () => {
      currentMockSupabase = buildMockSupabase({
        owner_files: [{ id: OWNER_FILE_ID, owner_id: OWNER_ID, status: 'DRAFT', created_at: '', updated_at: '' }],
        users: [{ id: TC_USER_ID, role: 'TIERS_CONFIANCE', active_role: 'TIERS_CONFIANCE' }],
        audit_logs: [],
      })

      const { PATCH } = await import('@/app/api/tc/owner-files/route')
      const req = createNextRequest('http://localhost:3000/api/tc/owner-files', {
        method: 'PATCH',
        body: { fileIds: [OWNER_FILE_ID], action: 'REJECT', comment: 'Test' },
      })
      const resp = await PATCH(req)
      const body = await resp.json()

      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('pas en attente')
    })
  })
})
