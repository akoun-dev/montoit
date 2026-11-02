#!/usr/bin/env node
/**
 * generate-types-from-migrations.mjs — DAT-001 (Mon Toit CI)
 * ==========================================================
 * Régénère `src/lib/supabase/types.ts` (type `Database` Supabase) à partir des
 * migrations SQL de `supabase/migrations/`. Remplace le fichier hand-written
 * (20/50 tables) par une couverture complète (50 tables publiques + 36 enums).
 *
 * POURQUOI CE SCRIPT :
 *   - Le projet n'a pas de `DATABASE_URL` Postgres joignable (le `.env` pointe
 *     vers l'ancien SQLite Prisma) et Docker/CLI Supabase ne tourne pas dans la
 *     sandbox → impossible d'utiliser `supabase gen types`.
 *   - Le schéma est 100 % versionné dans `supabase/migrations/` : le parser
 *     reconstruit donc un schéma fidèle (tables, colonnes, nullabilité,
 *     defaults, FK, enums, ALTER TABLE add column / alter column type /
 *     add constraint ... foreign key).
 *
 * USAGE :
 *   bun run scripts/generate-types-from-migrations.mjs
 *   # ou : node scripts/generate-types-from-migrations.mjs
 *
 * OPTIONS (env) :
 *   TYPES_OUT=path     fichier de sortie (défaut : src/lib/supabase/types.ts)
 *   MIGRATIONS_DIR=... dossier des migrations (défaut : supabase/migrations)
 *
 * APRÈS EXÉCUTION :
 *   1. Vérifier `bunx tsc --noEmit` (le script n'écrase que les définitions ;
 *      les alias exportés `UserRole` / `OtpType` sont conservés).
 *   2. Re-lancer ce script après TOUTE nouvelle migration — le fichier généré
 *      ne doit jamais être édité à la main.
 *
 * LIMITES CONNUES :
 *   - `Relationships` reconstruites à partir des FK déclarées ; le nom de
 *     contrainte des FK inline (non nommées) est déduit de la convention
 *     Postgres `<table>_<colonne>_fkey` (suffixe numérique en cas de collision).
 *   - Les types composites (CREATE TYPE ... AS (...)), vues et fonctions SQL ne
 *     sont pas détectés (aucun dans les migrations actuelles).
 *   - Les colonnes `GENERATED ALWAYS AS` ne sont pas gérées (aucune dans le
 *     schéma actuel).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR
  ? resolve(process.env.MIGRATIONS_DIR)
  : join(ROOT, 'supabase', 'migrations')
const OUT_FILE = process.env.TYPES_OUT
  ? resolve(process.env.TYPES_OUT)
  : join(ROOT, 'src', 'lib', 'supabase', 'types.ts')

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`✗ Dossier migrations introuvable : ${MIGRATIONS_DIR}`)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires SQL (respect des chaînes, des blocs $$ et des parenthèses)
// ─────────────────────────────────────────────────────────────────────────────

/** Supprime les commentaires `--` et `/* *​/` en respectant les chaînes '...' */
function stripSqlComments(sql) {
  let out = ''
  let i = 0
  const n = sql.length
  while (i < n) {
    const c = sql[i]
    if (c === "'") {
      // copie la chaîne telle quelle (gestion de '' échappé)
      let j = i + 1
      while (j < n) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { j += 2; continue }
          break
        }
        j++
      }
      out += sql.slice(i, j + 1)
      i = j + 1
    } else if (c === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++
    } else if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? n : end + 2
    } else {
      out += c
      i++
    }
  }
  return out
}

/** Retourne l'index du caractère fermant correspondant, en respectant '...' */
function findClosingParen(sql, start) {
  let depth = 0
  let i = start
  const n = sql.length
  while (i < n) {
    const c = sql[i]
    if (c === "'") {
      i++
      while (i < n) {
        if (sql[i] === "'") { if (sql[i + 1] === "'") { i += 2; continue } break }
        i++
      }
    } else if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

/** Découpe une liste d'items séparés par des virgules de niveau 0 */
function splitTopLevel(body, sep = ',') {
  const items = []
  let depth = 0
  let cur = ''
  let i = 0
  const n = body.length
  while (i < n) {
    const c = body[i]
    if (c === "'") {
      let j = i + 1
      while (j < n) {
        if (body[j] === "'") { if (body[j + 1] === "'") { j += 2; continue } break }
        j++
      }
      cur += body.slice(i, j + 1)
      i = j + 1
      continue
    }
    if (c === '(') depth++
    if (c === ')') depth--
    if (c === sep && depth === 0) {
      items.push(cur.trim())
      cur = ''
      i++
      continue
    }
    cur += c
    i++
  }
  if (cur.trim()) items.push(cur.trim())
  return items
}

/**
 * Découpe le SQL en statements de niveau 0. Les blocs dollar-quoted
 * ($$...$$, $tag$...$tag$) sont retournés comme un seul item, tag inclus.
 */
function splitStatements(sql) {
  const stmts = []
  let cur = ''
  let i = 0
  const n = sql.length
  while (i < n) {
    const c = sql[i]
    if (c === "'") {
      let j = i + 1
      while (j < n) {
        if (sql[j] === "'") { if (sql[j + 1] === "'") { j += 2; continue } break }
        j++
      }
      cur += sql.slice(i, j + 1)
      i = j + 1
      continue
    }
    if (c === '$') {
      const m = /^\$([a-zA-Z_]*)\$/.exec(sql.slice(i, i + 40))
      if (m) {
        const tag = m[0]
        const end = sql.indexOf(tag, i + tag.length)
        const stop = end === -1 ? n : end + tag.length
        cur += sql.slice(i, stop)
        i = stop
        continue
      }
    }
    if (c === ';') {
      if (cur.trim()) stmts.push(cur.trim())
      cur = ''
      i++
      continue
    }
    cur += c
    i++
  }
  if (cur.trim()) stmts.push(cur.trim())
  return stmts
}

/** Éclate un bloc `do $$ ... $$` en statements internes (pour enums/alters). */
function unwrapDoBlocks(stmt) {
  const m = /^do\s+\$[a-zA-Z_]*\$([\s\S]*)\$[a-zA-Z_]*\$;?$/i.exec(stmt)
  if (!m) return [stmt]
  const inner = m[1]
    // retire les begin/end/if englobants en conservant les instructions ;
    // on se contente de spliter sur les ';' — les regex cibles ne matchent
    // que create type / alter type / create table, le reste est ignoré.
    .replace(/^\s*(declare[\s\S]*?)?begin\b/i, '')
    .replace(/\bend\b\s*;?\s*$/i, '')
  return inner.split(';').map((s) => s.trim()).filter(Boolean)
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing du schéma
// ─────────────────────────────────────────────────────────────────────────────

const enums = new Map() // name -> { values: string[], source: string }
const tables = new Map() // name -> { columns: Map, relationships: [], source }

function ensureTable(name, source) {
  if (!tables.has(name)) {
    tables.set(name, { name, columns: new Map(), relationships: [], uniques: new Set(), source })
  }
  return tables.get(name)
}

/** Mappe un type Postgres vers le TS correspondant. */
/**
 * Mode de compatibilité (documenté dans l'entête du fichier généré) :
 *  - Les colonnes enum sont rendues `string` par défaut (comportement de
 *    l'ancien fichier hand-written) SAUF celles listées ci-dessous, qui
 *    étaient déjà typées strictement et le restent pour ne pas changer le
 *    contrat existant du code.
 *  - `TYPES_ENUM_STRICT=1 bun run scripts/...` force TOUTES les colonnes enum
 *    vers l'union PostgreSQL (~48 erreurs TS à corriger au préalable dans
 *    src/app/api/** — voir docs/DEDUP-LIB-EDGE-FUNCTIONS.md & worklog DAT-001).
 */
const STRICT_ENUM_COLUMNS_DEFAULT = new Set(['users.role', 'users.active_role', 'otp_codes.type'])
const STRICT_ENUMS_ALL = process.env.TYPES_ENUM_STRICT === '1'

function isEnumType(rawType) {
  const t = rawType.trim().toLowerCase().replace(/\[\]$/, '').replace(/\([^)]*\)/g, '').trim()
  return enums.has(t)
}

function pgTypeToTs(rawType, { tableName, colName, strict } = {}) {
  let t = rawType.trim().toLowerCase().replace(/\s+/g, ' ')
  const isArray = /\[\]$/.test(t) || / array$/.test(t)
  t = t.replace(/\[\]$/, '').replace(/ array$/, '')
  // retire les modificateurs : varchar(255), numeric(10, 2)
  t = t.replace(/\([^)]*\)/g, '').trim()

  let base
  if (enums.has(t)) {
    const strictColumn = STRICT_ENUMS_ALL ||
      (tableName && colName && STRICT_ENUM_COLUMNS_DEFAULT.has(`${tableName}.${colName}`))
    base = strict || strictColumn ? `Database['public']['Enums']['${t}']` : 'string'
  } else {
    const map = {
      text: 'string',
      citext: 'string',
      'character varying': 'string',
      varchar: 'string',
      character: 'string',
      char: 'string',
      '"char"': 'string',
      name: 'string',
      uuid: 'string',
      smallint: 'number',
      int2: 'number',
      integer: 'number',
      int: 'number',
      int4: 'number',
      bigint: 'number',
      int8: 'number',
      serial: 'number',
      serial4: 'number',
      bigserial: 'number',
      serial8: 'number',
      real: 'number',
      float4: 'number',
      'double precision': 'number',
      float8: 'number',
      numeric: 'number',
      decimal: 'number',
      money: 'number',
      boolean: 'boolean',
      bool: 'boolean',
      date: 'string',
      timestamp: 'string',
      'timestamp without time zone': 'string',
      timestamptz: 'string',
      'timestamp with time zone': 'string',
      time: 'string',
      'time without time zone': 'string',
      timetz: 'string',
      interval: 'string',
      json: STRICT_ENUMS_ALL ? 'Json' : 'unknown',
      jsonb: STRICT_ENUMS_ALL ? 'Json' : 'unknown',
      bytea: 'unknown',
      inet: 'string',
      cidr: 'string',
      macaddr: 'string',
      tsvector: 'unknown',
    }
    base = map[t] ?? 'unknown'
  }
  return isArray ? `${base}[]` : base
}

const COLUMN_CONSTRAINT_KEYWORDS =
  /^(primary\s+key|unique|not\s+null|null|references|default|check|constraint|generated|on\s+delete|on\s+update|collate)\b/i

/**
 * Parse une définition de colonne `name type [contraintes...]`.
 * Retourne { name, pgType, nullable, hasDefault, generated, isPrimaryKey, isUnique, references }
 */
function parseColumnDef(def) {
  const m = /^"?([a-zA-Z_][a-zA-Z0-9_$]*)"?\s+([\s\S]+)$/.exec(def.trim())
  if (!m) return null
  const name = m[1]
  const rest = m[2].trim()

  // ── type : on avance jusqu'au premier mot-clé de contrainte ──
  const tokens = rest.split(/\s+/)
  let typeEnd = 0
  let cursor = 0
  const n = rest.length
  while (cursor < n) {
    // saute les parenthèses (modificateurs de type) et les chaînes
    const ch = rest[cursor]
    if (ch === "'") {
      cursor++
      while (cursor < n) {
        if (rest[cursor] === "'") { if (rest[cursor + 1] === "'") { cursor += 2; continue } break }
        cursor++
      }
      cursor++
      continue
    }
    if (ch === '(') {
      const close = findClosingParen(rest, cursor)
      cursor = close === -1 ? n : close + 1
      continue
    }
    const remaining = rest.slice(cursor)
    if (COLUMN_CONSTRAINT_KEYWORDS.test(remaining)) break
    // avangage mot par mot
    const word = /^\S+/.exec(remaining)
    if (!word) break
    // Un mot-clé de contrainte peut être collé après le type : re-test par mot
    if (COLUMN_CONSTRAINT_KEYWORDS.test(remaining)) break
    typeEnd = cursor + word[0].length
    cursor += word[0].length
    while (cursor < n && /\s/.test(rest[cursor])) cursor++
  }
  let pgType = rest.slice(0, typeEnd).trim()
  // cas particulier : "text[]" collé
  pgType = pgType.replace(/\s*\[\s*\]\s*$/, '[]')
  if (!pgType) return null

  let tail = rest.slice(typeEnd).trim()
  const col = {
    name,
    pgType,
    nullable: true,
    hasDefault: false,
    generated: false,
    isPrimaryKey: false,
    isUnique: false,
    references: null, // { table, columns, onDelete }
  }

  // ── contraintes ──
  let guard = 0
  while (tail && guard++ < 50) {
    let mm
    if ((mm = /^not\s+null\b/i.exec(tail))) {
      col.nullable = false
      tail = tail.slice(mm[0].length).trim()
    } else if ((mm = /^null\b/i.exec(tail))) {
      col.nullable = true
      tail = tail.slice(mm[0].length).trim()
    } else if ((mm = /^primary\s+key\b/i.exec(tail))) {
      col.isPrimaryKey = true
      col.nullable = false
      tail = tail.slice(mm[0].length).trim()
    } else if ((mm = /^unique\b/i.exec(tail))) {
      col.isUnique = true
      tail = tail.slice(mm[0].length).trim()
    } else if ((mm = /^references\s+/i.exec(tail))) {
      const ref = /^references\s+(?:only\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_$]*)\s*(\([^)]*\))?/i.exec(tail)
      if (!ref) break
      const cols = ref[2] ? ref[2].slice(1, -1).split(',').map((c) => c.trim().replace(/^"|"$/g, '')) : ['id']
      col.references = { table: ref[1], columns: cols, onDelete: null }
      tail = tail.slice(ref[0].length).trim()
      const od = /^on\s+delete\s+(cascade|set\s+null|set\s+default|restrict|no\s+action)/i.exec(tail)
      if (od) {
        col.references.onDelete = od[1].toLowerCase().replace(/\s+/g, ' ')
        tail = tail.slice(od[0].length).trim()
      }
    } else if ((mm = /^default\b/i.exec(tail))) {
      col.hasDefault = true
      // consomme la valeur du default (parenthèses/chaînes respectées)
      let j = mm[0].length
      let depth = 0
      while (j < tail.length) {
        const ch = tail[j]
        if (ch === "'") {
          j++
          while (j < tail.length) {
            if (tail[j] === "'") { if (tail[j + 1] === "'") { j += 2; continue } break }
            j++
          }
          j++
          continue
        }
        if (ch === '(') depth++
        if (ch === ')') { depth--; j++; continue }
        if (depth === 0 && (ch === ',' || /\s/.test(ch))) {
          const lookahead = tail.slice(j).trimStart()
          if (ch === ',' || /^(not\s+null|null|primary\s+key|unique|references|check|generated|constraint)\b/i.test(lookahead)) break
          j++
          continue
        }
        j++
      }
      tail = tail.slice(j).trim()
    } else if ((mm = /^check\b/i.exec(tail))) {
      const open = tail.indexOf('(', mm.index)
      if (open === -1) break
      const close = findClosingParen(tail, open)
      tail = (close === -1 ? '' : tail.slice(close + 1)).trim()
    } else if ((mm = /^constraint\s+\S+/i.exec(tail))) {
      // contrainte nommée inline : on continue de parser la suite
      tail = tail.slice(mm[0].length).trim()
    } else if ((mm = /^generated\b/i.exec(tail))) {
      col.generated = true
      tail = tail.slice(mm[0].length).trim()
    } else if ((mm = /^(on\s+delete|on\s+update|deferrable|initially|collate)\b/i.exec(tail))) {
      tail = tail.slice(mm[0].length).trim()
      const od = /^(cascade|set\s+null|set\s+default|restrict|no\s+action)/i.exec(tail)
      if (od) tail = tail.slice(od[0].length).trim()
    } else {
      // mot inconnu : on le saute pour ne pas boucler
      const word = /^\S+/.exec(tail)
      if (!word) break
      tail = tail.slice(word[0].length).trim()
    }
  }
  return col
}

/** Traite un statement `create table ...` */
function parseCreateTable(stmt, source) {
  const m = /create\s+(?:unlogged\s+|temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:(public)\.)?([a-zA-Z_][a-zA-Z0-9_$]*)\s*\(/i.exec(stmt)
  if (!m) return
  const schema = (m[1] || 'public').toLowerCase()
  const name = m[2]
  if (schema !== 'public') return
  if (/\btemp(?:orary)?\b/i.test(stmt.slice(0, m.index + 20))) return // tables temporaires ignorées
  const open = stmt.indexOf('(', m.index)
  const close = findClosingParen(stmt, open)
  const body = stmt.slice(open + 1, close)

  const table = ensureTable(name, source)
  const items = splitTopLevel(body)
  for (const item of items) {
    // ── contraintes de table d'abord : les items `CONSTRAINT ... FOREIGN KEY ...`
    //    matcheraient sinon le parseur de colonnes (name='CONSTRAINT') ──
    if (/^(constraint\s+\w+\s+)?(primary\s+key|foreign\s+key|unique|check|exclude)\b/i.test(item)) {
      parseTableConstraint(table.name, item, table)
      continue
    }
    const column = parseColumnDef(item)
    if (column) {
      table.columns.set(column.name, column)
      continue
    }
    let tm
    if ((tm = /^constraint\s+(\w+)\s+primary\s+key\s*\(([^)]*)\)/i.exec(item))) {
      const cols = tm[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      for (const c of cols) {
        const col = table.columns.get(c)
        if (col) { col.isPrimaryKey = true; col.nullable = false }
      }
    } else if ((tm = /^constraint\s+(\w+)\s+unique\s*\(([^)]*)\)/i.exec(item))) {
      const cols = tm[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      table.uniques.add(cols.join(','))
    } else if ((tm = /^(?:constraint\s+(\w+)\s+)?foreign\s+key\s*\(([^)]*)\)\s*references\s+(?:only\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_$]*)\s*(\([^)]*\))?(?:\s*(?:on\s+delete\s+(cascade|set\s+null|set\s+default|restrict|no\s+action)))?/i.exec(item))) {
      const fkName = tm[1] || null
      const cols = tm[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      const refTable = tm[3]
      const refCols = tm[4] ? tm[4].slice(1, -1).split(',').map((c) => c.trim()) : ['id']
      const onDelete = (tm[5] || 'no action').toLowerCase()
      table.relationships.push({ name: fkName, columns: cols, referencedRelation: refTable, referencedColumns: refCols, onDelete })
    }
  }
}

/** Traite un statement `alter table ...` (add column / alter column type / add constraint) */
function parseAlterTable(stmt, source) {
  const m = /^alter\s+table\s+(?:only\s+|if\s+exists\s+)?(?:(public)\.)?([a-zA-Z_][a-zA-Z0-9_$]*)\s+([\s\S]+)$/i.exec(stmt)
  if (!m) return
  const schema = (m[1] || 'public').toLowerCase()
  if (schema !== 'public') return
  const tableName = m[2]
  if (!tables.has(tableName)) return
  const table = tables.get(tableName)
  const rest = m[3].trim()

  // enable/disable row level security, owner, etc.
  if (/^(enable|disable|force|no\s+force)\s+row\s+level\s+security/i.test(rest)) return
  if (/^owner\s+to/i.test(rest)) return
  if (/^replica\s+identity/i.test(rest)) return

  // add column [if not exists] <def> [, add column ...]
  if (/^add\s+column\b/i.test(rest) || /^add\b(?!.*\bconstraint\b)(?!.*\bforeign\b)/i.test(rest)) {
    const parts = splitTopLevel(rest)
    for (const part of parts) {
      const pm = /^add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?([\s\S]+)$/i.exec(part.trim())
      if (!pm) continue
      const def = pm[1].trim()
      if (/^(constraint|foreign|primary|unique|check|exclude)\b/i.test(def)) {
        // contrainte ajoutée via add constraint / add foreign key
        parseTableConstraint(tableName, def, table)
        continue
      }
      const col = parseColumnDef(def)
      if (col && !table.columns.has(col.name)) table.columns.set(col.name, col)
    }
    return
  }

  // alter column ... type ... [using ...]
  const am = /^alter\s+column\s+"?([a-zA-Z_][a-zA-Z0-9_$]*)"?\s+type\s+([\s\S]+?)(?:\s+using\b[\s\S]*)?$/i.exec(rest)
  if (am) {
    const col = table.columns.get(am[1])
    if (col) col.pgType = am[2].trim().replace(/\s+/g, ' ')
    return
  }

  // add constraint ... foreign key ...
  if (/^add\s+(?:constraint\s+\S+\s+)?(foreign\s+key|primary\s+key|unique|check)/i.test(rest)) {
    parseTableConstraint(tableName, rest.replace(/^add\s+/i, ''), table)
    return
  }
  // drop constraint [if exists] <name> → retire la relationship correspondante
  const dm = /^drop\s+constraint\s+(?:if\s+exists\s+)?([a-zA-Z_][a-zA-Z0-9_$]*)/i.exec(rest)
  if (dm) {
    const name = dm[1]
    const idx = table.relationships.findIndex((r) => r.name === name)
    if (idx !== -1) table.relationships.splice(idx, 1)
    return
  }
  // drop column / rename / etc. : ignorés
}

function parseTableConstraint(tableName, def, table) {
  const fkm = /^(?:constraint\s+(\w+)\s+)?foreign\s+key\s*\(([^)]*)\)\s*references\s+(?:only\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_$]*)\s*(\([^)]*\))?(?:\s*on\s+delete\s+(cascade|set\s+null|set\s+default|restrict|no\s+action))?/i.exec(def)
  if (fkm) {
    table.relationships.push({
      name: fkm[1] || null,
      columns: fkm[2].split(',').map((c) => c.trim().replace(/^"|"$/g, '')),
      referencedRelation: fkm[3],
      referencedColumns: fkm[4] ? fkm[4].slice(1, -1).split(',').map((c) => c.trim()) : ['id'],
      onDelete: (fkm[5] || 'no action').toLowerCase(),
    })
    return
  }
  const um = /^(?:constraint\s+\w+\s+)?unique\s*\(([^)]*)\)/i.exec(def)
  if (um) table.uniques.add(um[1].split(',').map((c) => c.trim().replace(/^"|"$/g, '')).join(','))
  const pkm = /^(?:constraint\s+\w+\s+)?primary\s+key\s*\(([^)]*)\)/i.exec(def)
  if (pkm) {
    for (const c of pkm[1].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))) {
      const col = table.columns.get(c)
      if (col) { col.isPrimaryKey = true; col.nullable = false }
    }
  }
}

// ── Lecture des migrations ───────────────────────────────────────────────────
const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()

for (const file of files) {
  const raw = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
  const sql = stripSqlComments(raw)
  const statements = splitStatements(sql).flatMap(unwrapDoBlocks)

  for (const stmt of statements) {
    let m
    if ((m = /create\s+type\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_$]*)\s+as\s+enum\s*\(/i.exec(stmt))) {
      const open = stmt.indexOf('(', m.index + m[0].length - 1)
      const close = findClosingParen(stmt, open)
      const values = stmt
        .slice(open + 1, close)
        .split(',')
        .map((v) => v.trim().replace(/^'|'$/g, ''))
        .filter(Boolean)
      if (!enums.has(m[1])) enums.set(m[1], { values, source: file })
      continue
    }
    if ((m = /alter\s+type\s+(?:public\.)?([a-zA-Z_][a-zA-Z0-9_$]*)\s+add\s+value\s+(?:if\s+not\s+exists\s+)?'([^']+)'/i.exec(stmt))) {
      const e = enums.get(m[1])
      if (e && !e.values.includes(m[2])) e.values.push(m[2])
      continue
    }
    if (/^create\s+(?:unlogged\s+|temp(?:orary)?\s+)?table\b/i.test(stmt)) {
      parseCreateTable(stmt, file)
      continue
    }
    if (/^alter\s+table\b/i.test(stmt)) {
      parseAlterTable(stmt, file)
      continue
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Génération TypeScript
// ─────────────────────────────────────────────────────────────────────────────

function camel(name) {
  return name
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('')
}

/** Noms d'alias exportés (camelCase) avec déduplication. */
const enumAliasNames = new Map()
for (const [name, { values }] of enums) {
  let alias = camel(name)
  while ([...enumAliasNames.values()].includes(alias)) alias = alias + '_'
  enumAliasNames.set(name, alias)
}

function fmtEnumUnion(values) {
  // rendu multi-ligne d'une union TS valide :
  //   document_type:
  //     | 'ID_CARD'
  //     | 'PASSPORT'
  if (values.length <= 3) return ` ${values.map((v) => `'${v}'`).join(' | ')}`
  return `\n${values.map((v) => `    | '${v}'`).join('\n')}`
}

/** Nom de contrainte FK par convention Postgres, avec dédoublonnage. */
function computeFkNames() {
  const used = new Set()
  for (const table of tables.values()) {
    for (const rel of table.relationships) {
      if (!rel.name) {
        let base = `${table.name}_${rel.columns[0]}_fkey`
        let candidate = base
        let i = 1
        while (used.has(`${table.name}.${candidate}`)) candidate = `${base.replace(/_fkey$/, '')}_${i++}_fkey`
        rel.name = candidate
      }
      used.add(`${table.name}.${rel.name}`)
    }
  }
}

/**
 * Convertit les références inline (`col text references t(id)`) en
 * Relationships, en respectant la convention de nommage Postgres.
 */
function inlineRefsToRelationships() {
  for (const table of tables.values()) {
    for (const col of table.columns.values()) {
      if (!col.references) continue
      const dup = table.relationships.some(
        (r) =>
          r.columns.length === 1 &&
          r.columns[0] === col.name &&
          r.referencedRelation === col.references.table,
      )
      if (dup) continue
      table.relationships.push({
        name: null,
        columns: [col.name],
        referencedRelation: col.references.table,
        referencedColumns: col.references.columns,
        onDelete: col.references.onDelete || 'no action',
        inline: true,
      })
    }
  }
}

inlineRefsToRelationships()
computeFkNames()

// Les FK déclarées deux fois (ex. repointées par une migration corrective)
// ne doivent pas être dupliquées : dédoublonnage final par (colonnes, cible).
for (const table of tables.values()) {
  const seen = new Set()
  table.relationships = table.relationships.filter((r) => {
    const key = `${r.columns.join(',')}->${r.referencedRelation}(${r.referencedColumns.join(',')})`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function renderRow(col, tableName) {
  const ts = pgTypeToTs(col.pgType, { tableName, colName: col.name })
  return `${col.name}: ${ts}${col.nullable ? ' | null' : ''}`
}

function renderInsert(col, tableName) {
  const ts = pgTypeToTs(col.pgType, { tableName, colName: col.name })
  // Une PK sans default SQL est optionnelle en Insert : le pattern du projet
  // est de générer l'id applicativement (crypto.randomUUID) ; l'ancien
  // fichier hand-written les marquait tous optionnels (sauf users.id).
  const optional = col.nullable || col.hasDefault || col.generated || col.isPrimaryKey
  return `${col.name}${optional ? '?' : ''}: ${ts}${col.nullable ? ' | null' : ''}`
}

function renderUpdate(col, tableName) {
  const ts = pgTypeToTs(col.pgType, { tableName, colName: col.name })
  return `${col.name}?: ${ts}${col.nullable ? ' | null' : ''}`
}

function renderRelationships(table) {
  if (!table.relationships.length) return '        Relationships: []'
  const entries = table.relationships.map((rel) => {
    const isOneToOne = table.uniques.has(rel.columns.join(',')) ||
      (rel.columns.length === 1 && table.columns.get(rel.columns[0])?.isUnique)
    return `          {
            foreignKeyName: '${rel.name}'
            columns: [${rel.columns.map((c) => `'${c}'`).join(', ')}]
            isOneToOne: ${isOneToOne}
            referencedRelation: '${rel.referencedRelation}'
            referencedColumns: [${rel.referencedColumns.map((c) => `'${c}'`).join(', ')}]
          }`
  })
  return `        Relationships: [\n${entries.join(',\n')}\n        ]`
}

const sortedTables = [...tables.values()].sort((a, b) => a.name.localeCompare(b.name))
const sortedEnums = [...enums.entries()].sort((a, b) => a[0].localeCompare(b[0]))

const header = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
 *
 * Généré par \`scripts/generate-types-from-migrations.mjs\` à partir des
 * migrations SQL de \`supabase/migrations/\` (DAT-001).
 *
 * Régénération après toute nouvelle migration :
 * \`\`\`bash
 * bun run scripts/generate-types-from-migrations.mjs
 * \`\`\`
 *
 * Source de vérité : ${files.length} migrations SQL, ${sortedTables.length} tables
 * publiques, ${sortedEnums.length} enums.
 *
 * MODE DE COMPATIBILITÉ (par défaut) :
 *  - Couverture complète : ${sortedTables.length}/${sortedTables.length} tables, colonnes exactes
 *    (nullabilité, defaults), Relationships (FK) typées.
 *  - Les colonnes enum sont rendues \`string\` SAUF \`users.role\`,
 *    \`users.active_role\` et \`otp_codes.type\` (déjà strictes dans l'ancien
 *    fichier, contrat conservé) ; jsonb/json rendus \`unknown\` (comme
 *    l'ancien fichier). Raison : ~50 erreurs TS bloqueraient src/app/api/**
 *    en mode strict (Record<string, unknown> non assignable à Json, filtres
 *    \`.eq()\` sur des \`string\` arbitraires…). Les enums PostgreSQL restent
 *    intégralement typés dans \`Enums\` + alias exportés ci-dessous.
 *  - Bascule future vers le mode strict Supabase (enums + Json partout) :
 *    \`TYPES_ENUM_STRICT=1 bun run scripts/generate-types-from-migrations.mjs\`
 *    — à activer après correction des fichiers listés dans le worklog DAT-001.
 */

export interface Database {
  public: {
    Tables: {`

const body = sortedTables
  .map((table) => {
    const cols = [...table.columns.values()] // ordre de déclaration conservé
    return `      ${table.name}: {
        Row: {
${cols.map((c) => `          ${renderRow(c, table.name)}`).join('\n')}
        }
        Insert: {
${cols.map((c) => `          ${renderInsert(c, table.name)}`).join('\n')}
        }
        Update: {
${cols.map((c) => `          ${renderUpdate(c, table.name)}`).join('\n')}
        }
${renderRelationships(table)}
      }`
  })
  .join('\n')

const enumsBlock = sortedEnums
  .map(([name, { values }]) => `      ${name}:${fmtEnumUnion(values)}`)
  .join('\n')

const aliases = sortedEnums
  .map(([name]) => `export type ${enumAliasNames.get(name)} = Database['public']['Enums']['${name}']`)
  .join('\n')

const output = `${header}
${body}
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
${enumsBlock}
    }
    CompositeTypes: Record<string, never>
  }
}

// ─── Alias pratiques (compatibilité avec l'ancien fichier hand-written) ─────
${aliases}
`

writeFileSync(OUT_FILE, output, 'utf8')

// ── Résumé console ───────────────────────────────────────────────────────────
const coveredOld = 20
console.log(`✓ ${OUT_FILE} régénéré`)
console.log(`  Tables couvertes : ${sortedTables.length} (avant : ${coveredOld})`)
console.log(`  Enums couverts   : ${sortedEnums.length}`)
console.log(`  Migrations lues  : ${files.length}`)
const relCount = sortedTables.reduce((acc, t) => acc + t.relationships.length, 0)
console.log(`  Relationships    : ${relCount}`)
const unknownCols = []
for (const table of sortedTables) {
  for (const col of table.columns.values()) {
    const t = col.pgType.toLowerCase().trim()
    if (!enums.has(t) && !/^(text|citext|varchar|character varying|char|name|uuid|smallint|int2|integer|int|int4|bigint|int8|serial|bigserial|real|float4|double precision|float8|numeric|decimal|boolean|bool|date|timestamp|timestamptz|time|interval|json|jsonb|bytea)(\[\])?$/.test(t.replace(/\([^)]*\)/g, '').trim())) {
      unknownCols.push(`${table.name}.${col.name}: ${col.pgType}`)
    }
  }
}
if (unknownCols.length) console.log('  ⚠ Types non mappés (→ unknown) :\n    ' + unknownCols.join('\n    '))
