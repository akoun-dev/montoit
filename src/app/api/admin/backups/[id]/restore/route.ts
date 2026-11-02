import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { BACKUP_TABLES } from '../../route'

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
  return { userId: auth.userId }
}

// Restores a backup by upserting each row back into its table (merge, not a
// destructive wipe-and-replace) so the action stays reversible-ish and never
// silently deletes rows created after the snapshot was taken.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error
    const { id } = await params

    const supabase = getSupabaseAdminClient()
    const { data: backup } = await (supabase as any).from('backups').select('*').eq('id', id).single()
    if (!backup || backup.status !== 'completed' || !backup.storage_path) {
      return NextResponse.json({ error: 'Sauvegarde introuvable ou incomplète' }, { status: 404 })
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from('backups')
      .download(backup.storage_path)

    if (downloadError || !file) {
      return NextResponse.json({ error: downloadError?.message || 'Téléchargement échoué' }, { status: 500 })
    }

    const content = JSON.parse(await file.text()) as { tables: Record<string, any[]> }
    const summary: Record<string, number> = {}

    for (const table of BACKUP_TABLES) {
      const rows = content.tables?.[table] ?? []
      if (rows.length === 0) {
        summary[table] = 0
        continue
      }
      const { error } = await (supabase as any).from(table).upsert(rows, { onConflict: 'id' })
      if (error) {
        return NextResponse.json({ error: `Restauration de ${table} échouée: ${error.message}`, partialSummary: summary }, { status: 500 })
      }
      summary[table] = rows.length
    }

    await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      action: 'BACKUP_RESTORED',
      entity: 'Backup',
      entity_id: id,
      details: JSON.stringify({ fileName: backup.file_name, summary }),
      user_id: auth.userId,
    } as any)

    return NextResponse.json({ success: true, summary })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
