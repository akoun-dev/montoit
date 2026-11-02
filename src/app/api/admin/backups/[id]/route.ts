import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error
    const { id } = await params

    const supabase = getSupabaseAdminClient()
    const { data: backup } = await (supabase as any).from('backups').select('*').eq('id', id).single()
    if (!backup) {
      return NextResponse.json({ error: 'Sauvegarde introuvable' }, { status: 404 })
    }

    if (backup.storage_path) {
      await supabase.storage.from('backups').remove([backup.storage_path])
    }

    const { error } = await (supabase as any).from('backups').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      action: 'BACKUP_DELETED',
      entity: 'Backup',
      entity_id: id,
      details: JSON.stringify({ fileName: backup.file_name }),
      user_id: auth.userId,
    } as any)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
