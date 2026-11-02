import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

// Curated list of business tables included in a logical backup.
// Deliberately excludes identity/auth tables (users, sessions, otp_codes, ...)
// so a backup export never carries password hashes or other credentials.
export const BACKUP_TABLES = [
  'properties',
  'leases',
  'payments',
  'applications',
  'rental_files',
  'mandats',
  'commissions',
  'maintenance_requests',
  'disputes',
  'signalements',
] as const

interface Backup {
  id: string
  name: string
  date: string
  size: string
  status: 'completed' | 'in_progress' | 'failed'
}

async function requireAdmin(req: NextRequest) {
  const auth = await resolveRequestUser(req)
  if (!auth.userId) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }
  const supabase = getSupabaseAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', auth.userId)
    .single()
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 }) }
  }
  return { userId: auth.userId, applyCookies: auth.applyCookies }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  const units = ['Ko', 'Mo', 'Go']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

function toBackupDto(row: any): Backup {
  return {
    id: row.id,
    name: row.file_name,
    date: row.created_at,
    size: row.size || '—',
    status: row.status === 'running' ? 'in_progress' : row.status,
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error

    const supabase = getSupabaseAdminClient()
    const { data, error } = await (supabase as any)
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []
    const backups = rows.map(toBackupDto)

    return NextResponse.json({
      backups,
      stats: {
        totalBackups: rows.length,
        lastBackupSize: backups[0]?.size || '—',
        failedCount: backups.filter((b) => b.status === 'failed').length,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error

    const supabase = getSupabaseAdminClient()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const fileName = `backup-${now.slice(0, 10)}-${id.slice(0, 8)}.json`

    const { error: insertError } = await (supabase as any).from('backups').insert({
      id,
      file_name: fileName,
      status: 'running',
      type: 'manual',
      created_by: auth.userId,
      created_at: now,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    try {
      const snapshot: Record<string, any[]> = {}
      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table).select('*')
        if (error) throw new Error(`Export de ${table} échoué: ${error.message}`)
        snapshot[table] = data ?? []
      }

      const payload = JSON.stringify({ createdAt: now, tables: snapshot })
      const storagePath = `${id}.json`
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(storagePath, payload, { contentType: 'application/json', upsert: true })

      if (uploadError) throw new Error(`Téléversement échoué: ${uploadError.message}`)

      const sizeBytes = new TextEncoder().encode(payload).length
      const completedAt = new Date().toISOString()
      const { data: completed, error: updateError } = await (supabase as any)
        .from('backups')
        .update({
          status: 'completed',
          size: formatSize(sizeBytes),
          storage_path: storagePath,
          completed_at: completedAt,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw new Error(updateError.message)

      await supabase.from('audit_logs').insert({
        id: crypto.randomUUID(),
        action: 'BACKUP_CREATED',
        entity: 'Backup',
        entity_id: id,
        details: JSON.stringify({ fileName, size: formatSize(sizeBytes) }),
        user_id: auth.userId,
      } as any)

      return NextResponse.json({ backup: toBackupDto(completed), message: 'Sauvegarde terminée' })
    } catch (execError: any) {
      await (supabase as any)
        .from('backups')
        .update({ status: 'failed', error_message: execError.message, completed_at: new Date().toISOString() })
        .eq('id', id)
      return NextResponse.json({ error: execError.message || 'Échec de la sauvegarde' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
