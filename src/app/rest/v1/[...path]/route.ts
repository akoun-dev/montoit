import { NextRequest, NextResponse } from 'next/server'
import { getLocalPgPool } from '@/lib/pg-pool'

/**
 * PostgREST-lite — émulation locale de Supabase REST (option B, sandbox).
 *
 * NEXT_PUBLIC_SUPABASE_URL pointe vers cette application : le client
 * `@supabase/supabase-js` (server) appelle donc `/rest/v1/*` ici. Cette
 * émulation traduit le protocole PostgREST en SQL sur la base locale :
 *
 *  - GET    : filtres (eq, neq, gt, gte, lt, lte, like, ilike, is, in, not),
 *             select (colonnes + alias + `col->>clé`, embeds ignorés),
 *             order, limit/offset (+ en-tête Range), count (Prefer + Content-Range),
 *             `.single()` / `.maybeSingle()` (Accept vnd.pgrst.object+json).
 *  - POST   : insertion (1..n lignes), upsert via on_conflict + Prefer resolution.
 *  - PATCH  : mise à jour filtrée.
 *  - DELETE : suppression filtrée.
 *
 * ⚠️ Émulation VOLONTAIREMENT large (équivalent service_role) : la connexion
 * pg court-circuite la RLS. Réservée au sandbox — active uniquement quand
 * NEXT_PUBLIC_SUPABASE_URL pointe vers localhost.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const ARROW_RE = /^([a-zA-Z_][a-zA-Z0-9_]*)->>([a-zA-Z0-9_]+)$/
const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and'])

type Condition = { sql: string }

function pgError(status: number, code: string, message: string, details: string | null = null) {
  return NextResponse.json({ code, message, details, hint: null }, { status })
}

function mapPgError(error: { code?: string; message?: string }): NextResponse {
  const code = error.code ?? 'PGRST000'
  const message = error.message ?? 'Erreur Postgres'
  const status =
    code === '42P01' ? 404 : code === '23505' ? 409 : code === '42501' ? 403 : 400
  console.error(`[postgrest-lite] PG ${code}: ${message}`)
  return pgError(status, code, message)
}

/** Expression SQL d'une colonne (quotée — `order` etc. sont des mots-clés SQL) ou jsonb `col->>clé`. */
function columnExpr(raw: string): string | null {
  const arrow = ARROW_RE.exec(raw)
  if (arrow) {
    return `"${arrow[1]}"->>'${arrow[2]}'`
  }
  return IDENT_RE.test(raw) ? `"${raw}"` : null
}

/** Parse un filtre PostgREST : valeur `op.valeur` (avec préfixe `not.` éventuel). */
function parseFilter(expr: string, opValue: string, params: unknown[]): Condition | null {
  const dotIndex = opValue.indexOf('.')
  if (dotIndex <= 0) return null
  const op = opValue.slice(0, dotIndex)
  const rest = opValue.slice(dotIndex + 1)

  if (op === 'not') {
    const inner = parseFilter(expr, rest, params)
    return inner ? { sql: `NOT (${inner.sql})` } : null
  }
  switch (op) {
    case 'eq':
      params.push(rest)
      return { sql: `${expr} = $${params.length}` }
    case 'neq':
      params.push(rest)
      return { sql: `${expr} <> $${params.length}` }
    case 'gt':
      params.push(rest)
      return { sql: `${expr} > $${params.length}` }
    case 'gte':
      params.push(rest)
      return { sql: `${expr} >= $${params.length}` }
    case 'lt':
      params.push(rest)
      return { sql: `${expr} < $${params.length}` }
    case 'lte':
      params.push(rest)
      return { sql: `${expr} <= $${params.length}` }
    case 'like':
      params.push(rest)
      return { sql: `${expr} LIKE $${params.length}` }
    case 'ilike':
      params.push(rest)
      return { sql: `${expr} ILIKE $${params.length}` }
    case 'is': {
      if (rest === 'null') return { sql: `${expr} IS NULL` }
      if (rest === 'not_null') return { sql: `${expr} IS NOT NULL` }
      if (rest === 'true' || rest === 'false') {
        params.push(rest === 'true')
        return { sql: `${expr} = $${params.length}` }
      }
      return null
    }
    case 'in': {
      const inner = rest.replace(/^\(/, '').replace(/\)$/, '')
      if (inner.trim() === '') return { sql: 'FALSE' }
      const values = inner.split(',').map((v) => v.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'))
      for (const v of values) params.push(v)
      const placeholders = values.map((_, i) => `$${params.length - values.length + 1 + i}`)
      return { sql: `${expr} IN (${placeholders.join(', ')})` }
    }
    default:
      return null
  }
}

/** Parse une expression logique PostgREST imbriquée : `a.eq.1,or=(b.eq.2,c.eq.3)`. */
function buildLogicExpr(expr: string, params: unknown[], combine: 'AND' | 'OR'): string | null {
  const parts = splitTop(expr)
  if (parts.length === 0) return null
  const conditions: string[] = []
  for (const part of parts) {
    const andGroup = /^and\(([\s\S]*)\)$/.exec(part)
    const orGroup = /^or\(([\s\S]*)\)$/.exec(part)
    if (andGroup) {
      const sub = buildLogicExpr(andGroup[1], params, 'AND')
      if (!sub) return null
      conditions.push(`(${sub})`)
    } else if (orGroup) {
      const sub = buildLogicExpr(orGroup[1], params, 'OR')
      if (!sub) return null
      conditions.push(`(${sub})`)
    } else {
      // Filtre simple : col.op.valeur (l'op est le premier segment après col)
      const dotIndex = part.indexOf('.')
      if (dotIndex <= 0) return null
      const col = part.slice(0, dotIndex)
      const columnExprValue = columnExpr(col)
      if (!columnExprValue) return null
      const condition = parseFilter(columnExprValue, part.slice(dotIndex + 1), params)
      if (!condition) return null
      conditions.push(condition.sql)
    }
  }
  return conditions.join(` ${combine} `)
}

/** Construit les conditions WHERE à partir des query params PostgREST. */
function buildWhere(searchParams: URLSearchParams, params: unknown[]): { where: string; ok: boolean } {
  const conditions: Condition[] = []
  for (const [rawKey, rawValue] of searchParams.entries()) {
    if (RESERVED_PARAMS.has(rawKey)) continue
    if (rawKey === 'or' || rawKey === 'and') {
      // Valeurs : `(filtre1,filtre2,...)` — parenthèses externes retirées
      const inner = rawValue.replace(/^\s*\(/, '').replace(/\)\s*$/, '')
      const logic = buildLogicExpr(inner, params, rawKey === 'or' ? 'OR' : 'AND')
      if (!logic) return { where: '', ok: false }
      conditions.push({ sql: `(${logic})` })
      continue
    }
    const expr = columnExpr(rawKey)
    if (!expr) return { where: '', ok: false }
    const condition = parseFilter(expr, rawValue, params)
    if (!condition) return { where: '', ok: false }
    conditions.push(condition)
  }
  return { where: conditions.length ? ` WHERE ${conditions.map((c) => c.sql).join(' AND ')}` : '', ok: true }
}

/** Découpe une liste en respectant les parenthèses (select, order…). */
function splitTop(value: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const ch of value) {
    if (ch === '(') depth += 1
    else if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      if (current.trim()) out.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) out.push(current.trim())
  return out
}

/** Traduit le paramètre `select` en liste SQL (embeds `relation(...)` ignorés). */
function buildSelect(raw: string | null): string {
  if (!raw || !raw.trim()) return '*'
  const parts: string[] = []
  for (const token of splitTop(raw)) {
    if (token.includes('(')) continue // ressource embarquée — non supportée
    let expr: string | null = null
    let alias: string | null = null
    const colon = token.indexOf(':')
    if (colon > 0) {
      alias = token.slice(0, colon)
      expr = columnExpr(token.slice(colon + 1))
    } else {
      expr = columnExpr(token)
    }
    if (!expr || (alias && !IDENT_RE.test(alias))) continue
    if (alias) {
      parts.push(`${expr} AS "${alias}"`)
    } else if (ARROW_RE.test(token)) {
      const key = ARROW_RE.exec(token)![2]
      parts.push(`${expr} AS "${key}"`)
    } else {
      parts.push(expr)
    }
  }
  return parts.length ? parts.join(', ') : '*'
}

/** Traduit le paramètre `order` (ex. `updated_at.desc.nullslast, id.asc`). */
function buildOrder(raw: string | null): string {
  if (!raw) return ''
  const parts: string[] = []
  for (const token of splitTop(raw)) {
    const pieces = token.split('.')
    const expr = columnExpr(pieces[0])
    if (!expr) continue
    const dir = pieces[1] === 'desc' ? 'DESC' : pieces[1] === 'asc' ? 'ASC' : ''
    const nulls = pieces[2] === 'nullsfirst' ? ' NULLS FIRST' : pieces[2] === 'nullslast' ? ' NULLS LAST' : ''
    parts.push(`${expr}${dir ? ' ' + dir : ''}${nulls}`)
  }
  return parts.length ? ` ORDER BY ${parts.join(', ')}` : ''
}

interface RequestContext {
  table: string
  searchParams: URLSearchParams
  params: unknown[]
  where: string
  ok: boolean
}

function parseContext(req: NextRequest, path: string[]): RequestContext | null {
  if (path.length !== 1 || !IDENT_RE.test(path[0])) return null
  const searchParams = req.nextUrl.searchParams
  const params: unknown[] = []
  const { where, ok } = buildWhere(searchParams, params)
  if (!ok) return null
  return { table: path[0], searchParams, params, where, ok: true }
}

/** Limite/offset : query params `limit`/`offset` ou en-tête `Range: a-b`. */
function buildLimitOffset(req: NextRequest, searchParams: URLSearchParams): string {
  const rangeHeader = req.headers.get('range')
  let limit: number | null = null
  let offset = 0

  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  if (limitParam !== null && /^\d+$/.test(limitParam)) limit = parseInt(limitParam, 10)
  if (offsetParam !== null && /^\d+$/.test(offsetParam)) offset = parseInt(offsetParam, 10)

  if (rangeHeader) {
    const match = /^(\d+)-(\d+|\*)$/.exec(rangeHeader.trim())
    if (match) {
      offset = offset || parseInt(match[1], 10)
      if (match[2] !== '*') limit = parseInt(match[2], 10) - parseInt(match[1], 10) + 1
    }
  }

  const limitSql = limit !== null ? ` LIMIT ${limit}` : ''
  const offsetSql = offset > 0 ? ` OFFSET ${offset}` : ''
  return `${limitSql}${offsetSql}`
}

function wantsObjectAccept(req: NextRequest): boolean {
  return (req.headers.get('accept') ?? '').includes('vnd.pgrst.object')
}

function wantsCount(req: NextRequest): boolean {
  return /count=(exact|planned|estimated)/.test(req.headers.get('prefer') ?? '')
}

function wantRepresentation(req: NextRequest): boolean {
  return /return=representation/.test(req.headers.get('prefer') ?? '')
}

function contentRangeHeader(rowsCount: number, total: number | null, headOnly: boolean): string | undefined {
  if (total === null) return undefined
  if (headOnly) return `*/${total}`
  return rowsCount > 0 ? `0-${rowsCount - 1}/${total}` : `*/${total}`
}

async function runCount(table: string, where: string, params: unknown[]): Promise<number> {
  const pool = getLocalPgPool()
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM public.${table}${where}`, params)
  return rows[0]?.n ?? 0
}

// ─── GET / HEAD ──────────────────────────────────────────────────────────────

async function handleRead(req: NextRequest, path: string[], headOnly: boolean): Promise<NextResponse> {
  const ctx = parseContext(req, path)
  if (!ctx) return pgError(400, 'PGRST100', 'Requête PostgREST invalide (table ou filtre)')

  try {
    const pool = getLocalPgPool()
    const objectAccept = wantsObjectAccept(req)
    const countTotal = wantsCount(req) ? await runCount(ctx.table, ctx.where, ctx.params) : null

    if (headOnly) {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const range = contentRangeHeader(0, countTotal ?? 0, true)
      if (range) headers.set('Content-Range', range)
      return new NextResponse(null, { status: 200, headers })
    }

    // object accept : on ramène au plus 2 lignes pour détecter l'ambiguïté
    const sql = `SELECT ${buildSelect(ctx.searchParams.get('select'))} FROM public.${ctx.table}${ctx.where}${buildOrder(ctx.searchParams.get('order'))}${buildLimitOffset(req, ctx.searchParams)}`
    const result = await pool.query(sql, ctx.params)
    let rows = result.rows

    if (objectAccept) {
      if (rows.length > 1) {
        return pgError(406, 'PGRST116', `JSON object requested, multiple (or no) rows returned`, `${rows.length} rows`)
      }
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const range = contentRangeHeader(rows.length, countTotal, false)
      if (range) headers.set('Content-Range', range)
      return new NextResponse(JSON.stringify(rows[0] ?? null), { status: 200, headers })
    }

    rows = rows as Record<string, unknown>[]
    const headers = new Headers({ 'Content-Type': 'application/json' })
    const range = contentRangeHeader(rows.length, countTotal, false)
    if (range) headers.set('Content-Range', range)
    return new NextResponse(JSON.stringify(rows), { status: 200, headers })
  } catch (error) {
    return mapPgError(error as { code?: string; message?: string })
  }
}

// ─── Écritures ───────────────────────────────────────────────────────────────

function rowColumns(rows: Record<string, unknown>[]): string[] | null {
  const set = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!IDENT_RE.test(key)) return null
      set.add(key)
    }
  }
  return [...set]
}

function respondRows(req: NextRequest, rows: Record<string, unknown>[], status: number): NextResponse {
  const objectAccept = wantsObjectAccept(req)
  if (!wantRepresentation(req) && !objectAccept) {
    return new NextResponse(null, { status: status === 200 ? 204 : status })
  }
  if (objectAccept) {
    if (rows.length > 1) {
      return pgError(406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned', `${rows.length} rows`)
    }
    return new NextResponse(JSON.stringify(rows[0] ?? null), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new NextResponse(JSON.stringify(rows), { status, headers: { 'Content-Type': 'application/json' } })
}

async function handleInsert(req: NextRequest, path: string[]): Promise<NextResponse> {
  const ctx = parseContext(req, path)
  if (!ctx) return pgError(400, 'PGRST100', 'Requête PostgREST invalide')
  const body = await req.json().catch(() => null)
  if (!body) return pgError(400, 'PGRST102', 'Corps JSON invalide')

  const rowsInput: Record<string, unknown>[] = Array.isArray(body) ? body : [body]
  if (rowsInput.length === 0) return pgError(400, 'PGRST102', 'Corps vide')

  const columns = rowColumns(rowsInput)
  if (!columns || columns.length === 0) return pgError(400, 'PGRST102', 'Colonnes invalides')

  const valuesSql = rowsInput.map((row) => {
    const placeholders = columns.map((col) => {
      ctx.params.push(row[col] === undefined ? null : row[col])
      return `$${ctx.params.length}`
    })
    return `(${placeholders.join(', ')})`
  })

  const onConflict = ctx.searchParams.get('on_conflict')
  const prefer = req.headers.get('prefer') ?? ''
  let conflictSql = ''
  if (prefer.includes('resolution=merge-duplicates') && onConflict) {
    const target = splitTop(onConflict).filter((c) => IDENT_RE.test(c))
    if (target.length) {
      const updates = columns
        .filter((c) => !target.includes(c))
        .map((c) => `"${c}" = EXCLUDED."${c}"`)
        .join(', ')
      conflictSql = ` ON CONFLICT ("${target.join('", "')}") DO UPDATE SET ${updates || '"id" = EXCLUDED.id'}`
    }
  } else if (prefer.includes('resolution=ignore-duplicates') && onConflict) {
    const target = splitTop(onConflict).filter((c) => IDENT_RE.test(c))
    if (target.length) conflictSql = ` ON CONFLICT ("${target.join('", "')}") DO NOTHING`
  }

  const returning = wantRepresentation(req) || wantsObjectAccept(req) ? ' RETURNING *' : ''
  try {
    const pool = getLocalPgPool()
    const sql = `INSERT INTO public.${ctx.table} ("${columns.join('", "')}") VALUES ${valuesSql.join(', ')}${conflictSql}${returning}`
    const result = await pool.query(sql, ctx.params)
    return respondRows(req, result.rows, 201)
  } catch (error) {
    return mapPgError(error as { code?: string; message?: string })
  }
}

async function handleUpdate(req: NextRequest, path: string[]): Promise<NextResponse> {
  const ctx = parseContext(req, path)
  if (!ctx) return pgError(400, 'PGRST100', 'Requête PostgREST invalide')
  if (!ctx.where) return pgError(400, 'PGRST101', 'Les filtres sont requis pour PATCH/DELETE')

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return pgError(400, 'PGRST102', 'Corps JSON invalide')
  }
  const columns = rowColumns([body])
  if (!columns || columns.length === 0) return pgError(400, 'PGRST102', 'Colonnes invalides')

  const assignments = columns.map((col) => {
    ctx.params.push(body[col] === undefined ? null : body[col])
    return `"${col}" = $${ctx.params.length}`
  })
  const returning = wantRepresentation(req) || wantsObjectAccept(req) ? ' RETURNING *' : ''

  try {
    const pool = getLocalPgPool()
    const sql = `UPDATE public.${ctx.table} SET ${assignments.join(', ')}${ctx.where}${returning}`
    const result = await pool.query(sql, ctx.params)
    return respondRows(req, result.rows, 200)
  } catch (error) {
    return mapPgError(error as { code?: string; message?: string })
  }
}

async function handleDelete(req: NextRequest, path: string[]): Promise<NextResponse> {
  const ctx = parseContext(req, path)
  if (!ctx) return pgError(400, 'PGRST100', 'Requête PostgREST invalide')
  if (!ctx.where) return pgError(400, 'PGRST101', 'Les filtres sont requis pour PATCH/DELETE')

  const returning = wantRepresentation(req) || wantsObjectAccept(req) ? ' RETURNING *' : ''
  try {
    const pool = getLocalPgPool()
    const result = await pool.query(`DELETE FROM public.${ctx.table}${ctx.where}${returning}`, ctx.params)
    return respondRows(req, result.rows, 200)
  } catch (error) {
    return mapPgError(error as { code?: string; message?: string })
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

function emulationEnabled(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }): Promise<NextResponse> {
  if (!emulationEnabled()) return pgError(404, 'PGRST404', 'Émulation PostgREST désactivée')
  const { path = [] } = await ctx.params
  return handleRead(req, path, false)
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }): Promise<NextResponse> {
  if (!emulationEnabled()) return pgError(404, 'PGRST404', 'Émulation PostgREST désactivée')
  const { path = [] } = await ctx.params
  return handleRead(req, path, true)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }): Promise<NextResponse> {
  if (!emulationEnabled()) return pgError(404, 'PGRST404', 'Émulation PostgREST désactivée')
  const { path = [] } = await ctx.params
  if (path[0] === 'rpc') {
    return pgError(404, 'PGRST404', `Fonction RPC non supportée par l'émulation : ${path[1] ?? '?'}`)
  }
  return handleInsert(req, path)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }): Promise<NextResponse> {
  if (!emulationEnabled()) return pgError(404, 'PGRST404', 'Émulation PostgREST désactivée')
  const { path = [] } = await ctx.params
  return handleUpdate(req, path)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }): Promise<NextResponse> {
  if (!emulationEnabled()) return pgError(404, 'PGRST404', 'Émulation PostgREST désactivée')
  const { path = [] } = await ctx.params
  return handleDelete(req, path)
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 })
}
